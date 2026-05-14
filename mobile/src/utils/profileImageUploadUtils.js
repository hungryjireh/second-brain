import * as ImagePicker from 'expo-image-picker';
import resolveSupabaseConfig from './resolveSupabaseConfig';
import { resolveStorageOwnerSegmentFromToken } from './profileStorageOwner';

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);
const EXTENSION_TO_MIME_TYPE = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
};

export function resolveProfileImageContentType({ mimeType, extension }) {
  const normalizedMimeType = String(mimeType || '').toLowerCase().trim();
  if (normalizedMimeType) return normalizedMimeType;
  return EXTENSION_TO_MIME_TYPE[extension] || 'image/jpeg';
}

export function resolveImageExtension(asset) {
  const fileNameExtension = String(asset?.fileName || '')
    .split('.')
    .pop()
    ?.toLowerCase()
    .trim();
  if (fileNameExtension) return fileNameExtension;

  const uriExtension = String(asset?.uri || '')
    .split('?')[0]
    .split('.')
    .pop()
    ?.toLowerCase()
    .trim();
  if (uriExtension) return uriExtension;

  const mimeType = String(asset?.mimeType || '').toLowerCase();
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('heic')) return 'heic';
  if (mimeType.includes('heif')) return 'heif';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  return '';
}

export async function pickAndValidateProfileImage() {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    throw new Error('Photo library permission is required to upload a profile photo.');
  }

  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (pickerResult.canceled || !pickerResult.assets?.length) return null;

  const asset = pickerResult.assets[0];
  const sourceUri = String(asset.uri || '').trim();
  if (!sourceUri) {
    throw new Error('Could not read the selected image.');
  }

  const extension = resolveImageExtension(asset);
  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    throw new Error('Unsupported image type. Please upload a JPG, PNG, WEBP, GIF, or HEIC image.');
  }

  const selectedFileSize = Number(asset.fileSize);
  if (Number.isFinite(selectedFileSize) && selectedFileSize > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error('Image is too large. Maximum allowed size is 5MB.');
  }

  return { asset, sourceUri, extension };
}

export async function resolveStorageOwnerSegment({ token, username, supabaseConfig }) {
  const userIdFromToken = resolveStorageOwnerSegmentFromToken(token);
  if (userIdFromToken) return userIdFromToken;

  try {
    const authRes = await fetch(`${supabaseConfig.url}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: supabaseConfig.publishableKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (authRes.ok) {
      const authPayload = await authRes.json();
      const userId = String(authPayload?.id || authPayload?.user?.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
      if (userId) return userId;
    }
  } catch {
    // Ignore network/auth parsing failures and fall back to username-safe path.
  }

  return username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-') || 'user';
}

export async function uploadProfileImageAndGetPublicUrl({
  asset,
  sourceUri,
  extension,
  token,
  username,
  bucket = 'profileImage',
}) {
  const supabaseConfig = resolveSupabaseConfig();
  const mimeType = String(asset?.mimeType || '').toLowerCase();
  const safeExtension = String(extension || '').toLowerCase().trim();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(safeExtension)) {
    throw new Error('Unsupported image type for upload.');
  }
  const contentType = resolveProfileImageContentType({ mimeType, extension: safeExtension });
  const ownerSegment = await resolveStorageOwnerSegment({ token, username, supabaseConfig });
  const objectPath = `${ownerSegment}/${Date.now()}.${safeExtension}`;

  const sourceRes = await fetch(sourceUri);
  const imageBuffer = await sourceRes.arrayBuffer();
  if (!imageBuffer.byteLength) {
    throw new Error('Selected image is empty.');
  }
  if (imageBuffer.byteLength > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error('Image is too large. Maximum allowed size is 5MB.');
  }

  const uploadRes = await fetch(`${supabaseConfig.url}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: supabaseConfig.publishableKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: imageBuffer,
  });

  let uploadPayload = {};
  try {
    uploadPayload = await uploadRes.json();
  } catch {
    uploadPayload = {};
  }

  if (!uploadRes.ok) {
    const uploadError = String(uploadPayload?.message || uploadPayload?.error || `Upload failed (${uploadRes.status})`);
    if (uploadError.toLowerCase().includes('row-level security')) {
      throw new Error('Upload blocked by storage policy. Please confirm the bucket RLS policy allows uploads to your user-id folder.');
    }
    throw new Error(uploadError);
  }

  return `${supabaseConfig.url}/storage/v1/object/public/${bucket}/${objectPath}`;
}
