import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { apiRequest } from '../../api';
import * as ImagePicker from 'expo-image-picker';

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children }) => React.createElement(View, null, children),
  };
});

jest.mock('../../api', () => ({
  apiRequest: jest.fn(),
  invalidateApiCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock(
  'expo-image-picker',
  () => ({
    requestMediaLibraryPermissionsAsync: jest.fn(),
    launchImageLibraryAsync: jest.fn(),
    MediaTypeOptions: { Images: 'images' },
  }),
  { virtual: true }
);

jest.mock('../../components/OpenBrainSettingsLayout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }) => React.createElement(View, null, children);
});

jest.mock('../../components/TimezoneDropdown', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockTimezoneDropdown() {
    return React.createElement(Text, null, 'Timezone dropdown');
  };
});

describe('UpdateProfileScreen upload', () => {
  let UpdateProfileScreen;
  const navigation = { navigate: jest.fn(), replace: jest.fn() };
  const token = 'user-token-123';
  const jwtTokenWithSub = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYmMxMjMtVVNFUl9pZCJ9.signature';

  beforeAll(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'public-key';
    UpdateProfileScreen = require('../UpdateProfileScreen').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    apiRequest.mockResolvedValue({
      profile: {
        username: 'jireh',
        bio: '',
        avatar_url: '',
        timezone: 'Asia/Singapore',
        can_change_username: true,
      },
    });
  });

  it('shows permission error when media permission is denied', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: false });

    const { getByText, findByText } = render(<UpdateProfileScreen token={token} navigation={navigation} />);
    await findByText('Identity');

    fireEvent.press(getByText('Upload from device'));

    expect(await findByText('Photo library permission is required to upload a profile photo.')).toBeTruthy();
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('uploads selected image and sets avatar url', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/pic.jpg',
          fileName: 'pic.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
        },
      ],
    });

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user-987' }),
        status: 200,
      })
      .mockResolvedValueOnce({
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Key: 'profileImage/user-987/1.jpg' }),
        status: 200,
      });
    global.fetch = fetchMock;

    const { getByText, findByText } = render(<UpdateProfileScreen token={token} navigation={navigation} />);
    await findByText('Identity');

    fireEvent.press(getByText('Upload from device'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    await findByText('Photo uploaded. Save changes to apply it to your profile.');

    expect(fetchMock.mock.calls[0][0]).toContain('/auth/v1/user');
    expect(fetchMock.mock.calls[1][0]).toBe('file:///tmp/pic.jpg');
    expect(fetchMock.mock.calls[2][0]).toContain('/storage/v1/object/profileImage/user-987/');
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe(`Bearer ${token}`);
    expect(fetchMock.mock.calls[2][1].headers.apikey).toBe('public-key');

    fireEvent.press(getByText('Save changes'));
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/open-brain/profile',
        expect.objectContaining({
          method: 'PATCH',
          token,
          body: expect.objectContaining({
            avatar_url: expect.stringContaining('https://example.supabase.co/storage/v1/object/public/profileImage/user-987/'),
          }),
        })
      );
    });
    expect(apiRequest).toHaveBeenCalledWith(
      '/open-brain/profile',
      expect.objectContaining({
        cache: expect.objectContaining({ ttlMs: expect.any(Number) }),
        token,
      })
    );
  });

  it('uploads selected image into auth user-id folder when JWT sub is present', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/pic.jpg',
          fileName: 'pic.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
        },
      ],
    });

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Key: 'profileImage/abc123-USER_id/1.jpg' }),
        status: 200,
      });
    global.fetch = fetchMock;

    const { getByText, findByText } = render(<UpdateProfileScreen token={jwtTokenWithSub} navigation={navigation} />);
    await findByText('Identity');

    fireEvent.press(getByText('Upload from device'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(fetchMock.mock.calls[1][0]).toContain('/storage/v1/object/profileImage/abc123-USER_id/');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${jwtTokenWithSub}`);
  });

  it('shows an error for unsupported file extension', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/not-image.txt',
          fileName: 'not-image.txt',
          mimeType: 'text/plain',
          fileSize: 2048,
        },
      ],
    });

    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    const { getByText, findByText } = render(<UpdateProfileScreen token={token} navigation={navigation} />);
    await findByText('Identity');

    fireEvent.press(getByText('Upload from device'));

    expect(await findByText('Unsupported image type. Please upload a JPG, PNG, WEBP, GIF, or HEIC image.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows an error when image exceeds 5MB', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/large.jpg',
          fileName: 'large.jpg',
          mimeType: 'image/jpeg',
          fileSize: 6 * 1024 * 1024,
        },
      ],
    });

    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    const { getByText, findByText } = render(<UpdateProfileScreen token={token} navigation={navigation} />);
    await findByText('Identity');

    fireEvent.press(getByText('Upload from device'));

    expect(await findByText('Image is too large. Maximum allowed size is 5MB.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires confirmation before saving a changed username', async () => {
    apiRequest
      .mockResolvedValueOnce({
        profile: {
          id: 'my-profile-id',
          username: 'jireh',
          bio: '',
          avatar_url: '',
          timezone: 'Asia/Singapore',
          can_change_username: true,
        },
      })
      .mockResolvedValueOnce({
        profile: {
          id: 'my-profile-id',
          username: 'newhandle',
        },
      })
      .mockResolvedValueOnce({ ok: true });

    const { getByDisplayValue, getByText, findByText, queryByText } = render(
      <UpdateProfileScreen token={token} navigation={navigation} />
    );
    await findByText('Identity');

    fireEvent.changeText(getByDisplayValue('jireh'), 'newhandle');
    fireEvent.press(getByText('Save changes'));

    expect(await findByText('Confirm username change')).toBeTruthy();
    expect(queryByText('Profile updated successfully.')).toBeNull();
    expect(apiRequest).toHaveBeenCalledTimes(2);

    fireEvent.press(getByText('Confirm'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/open-brain/profile',
        expect.objectContaining({
          method: 'PATCH',
          token,
          body: expect.objectContaining({
            username: 'newhandle',
          }),
        })
      );
    });
  });

  it('closes the username confirmation without saving when cancelled', async () => {
    apiRequest
      .mockResolvedValueOnce({
        profile: {
          id: 'my-profile-id',
          username: 'jireh',
          bio: '',
          avatar_url: '',
          timezone: 'Asia/Singapore',
          can_change_username: true,
        },
      })
      .mockResolvedValueOnce({
        profile: {
          id: 'my-profile-id',
          username: 'newhandle',
        },
      });

    const { getByDisplayValue, getByText, findByText, queryByText } = render(
      <UpdateProfileScreen token={token} navigation={navigation} />
    );
    await findByText('Identity');

    fireEvent.changeText(getByDisplayValue('jireh'), 'newhandle');
    fireEvent.press(getByText('Save changes'));
    await findByText('Confirm username change');

    fireEvent.press(getByText('Cancel'));

    await waitFor(() => {
      expect(queryByText('Confirm username change')).toBeNull();
    });
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it('blocks username change when username already exists in profiles table', async () => {
    apiRequest
      .mockResolvedValueOnce({
        profile: {
          id: 'my-profile-id',
          username: 'jireh',
          bio: '',
          avatar_url: '',
          timezone: 'Asia/Singapore',
          can_change_username: true,
        },
      })
      .mockResolvedValueOnce({
        profile: {
          id: 'other-profile-id',
          username: 'takenname',
        },
      });

    const { getByDisplayValue, getByText, findByText, queryByText } = render(
      <UpdateProfileScreen token={token} navigation={navigation} />
    );
    await findByText('Identity');

    fireEvent.changeText(getByDisplayValue('jireh'), 'takenname');
    fireEvent.press(getByText('Save changes'));

    expect(await findByText('That username is already taken. Please choose another one.')).toBeTruthy();
    expect(queryByText('Confirm username change')).toBeNull();
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});
