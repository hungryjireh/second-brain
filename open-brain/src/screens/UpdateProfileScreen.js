import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { BlurView } from "expo-blur";
import { apiRequest, invalidateApiCache } from "../api";
import { CACHE_TTL_MS } from "../constants/cache";
import OpenBrainSettingsLayout from "../components/OpenBrainSettingsLayout";
import {
  pickAndValidateProfileImage,
  uploadProfileImageAndGetPublicUrl,
} from "../utils/profileImageUploadUtils";
import TimezoneDropdown from "../components/TimezoneDropdown";
import { theme } from "../theme";
import styles from "./UpdateProfileScreenStyles";

export default function UpdateProfileScreen({ token, navigation }) {
  const defaultTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Singapore",
    [],
  );
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [timezoneMenuOpen, setTimezoneMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [canChangeUsername, setCanChangeUsername] = useState(false);
  const [originalUsername, setOriginalUsername] = useState("");
  const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/open-brain/profile", {
        token,
        cache: { ttlMs: CACHE_TTL_MS.PROFILE },
      });
      const nextUsername = String(data.profile?.username || "");
      setUsername(nextUsername);
      setOriginalUsername(nextUsername);
      setProfileId(String(data.profile?.id || ""));
      setBio(String(data.profile?.bio || ""));
      setAvatarUrl(String(data.profile?.avatar_url || ""));
      setTimezone(String(data.profile?.timezone || defaultTimezone));
      setCanChangeUsername(Boolean(data.profile?.can_change_username));
    } catch (err) {
      if (
        String(err.message).toLowerCase().includes("404") ||
        String(err.message).toLowerCase().includes("not found")
      ) {
        navigation.replace("CreateOpenBrainProfile");
        return;
      }
      setError(err.message || "Failed to load your profile.");
    } finally {
      setLoading(false);
    }
  }, [defaultTimezone, navigation, token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleUploadAvatar() {
    if (uploadingAvatar || saving) return;
    setError("");
    setSuccess("");

    try {
      const selectedImage = await pickAndValidateProfileImage();
      if (!selectedImage) return;
      const { asset, sourceUri, extension } = selectedImage;

      setUploadingAvatar(true);
      const publicUrl = await uploadProfileImageAndGetPublicUrl({
        asset,
        sourceUri,
        extension,
        token,
        username,
      });
      setAvatarUrl(publicUrl);
      setSuccess("Photo uploaded. Save changes to apply it to your profile.");
    } catch (err) {
      setError(err.message || "Failed to upload profile photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  const usernameChanged = username.trim() !== originalUsername.trim();

  async function isUsernameAvailable(nextUsername) {
    try {
      const response = await apiRequest(
        `/open-brain/profile?username=${encodeURIComponent(nextUsername)}`,
        {
          token,
          cache: { enabled: false },
        },
      );
      const matchingProfileId = String(response?.profile?.id || "").trim();
      if (!matchingProfileId) return true;
      return matchingProfileId === profileId;
    } catch (err) {
      if (String(err?.message || "").includes("404")) return true;
      throw err;
    }
  }

  async function submitProfileUpdate() {
    if (
      !username.trim() ||
      !timezone.trim() ||
      saving ||
      uploadingAvatar ||
      checkingUsername
    )
      return;
    const nextUsername = username.trim();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest("/open-brain/profile", {
        method: "PATCH",
        token,
        body: {
          username: nextUsername,
          bio: bio.trim(),
          avatar_url: avatarUrl,
          timezone,
        },
      });
      await invalidateApiCache({
        token,
        exactPaths: ["/open-brain/profile"],
        pathPrefixes: ["/open-brain/feed"],
      });
      setUsername(nextUsername);
      setOriginalUsername(nextUsername);
      if (usernameChanged) setCanChangeUsername(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateProfile() {
    if (
      !username.trim() ||
      !timezone.trim() ||
      saving ||
      uploadingAvatar ||
      checkingUsername
    )
      return;
    if (canChangeUsername && usernameChanged) {
      setCheckingUsername(true);
      setError("");
      setSuccess("");
      try {
        const available = await isUsernameAvailable(username.trim());
        if (!available) {
          setError(
            "That username is already taken. Please choose another one.",
          );
          return;
        }
      } catch (err) {
        setError(err.message || "Failed to verify username availability.");
        return;
      } finally {
        setCheckingUsername(false);
      }
      setShowUsernameConfirm(true);
      return;
    }
    submitProfileUpdate();
  }

  function handleConfirmUsernameChange() {
    setShowUsernameConfirm(false);
    submitProfileUpdate();
  }

  return (
    <>
      <OpenBrainSettingsLayout
        token={token}
        navigation={navigation}
        backLabel="Back to settings"
        onBackPress={() => navigation.navigate("OpenBrainSettings")}
        title="Profile settings"
        copy="Edit how people see you on OpenBrain."
        headerStyle={styles.headerSection}
        scroll
        scrollStyle={styles.formScroll}
        scrollContentContainerStyle={styles.formContentContainer}
      >
        {loading ? (
          <View style={styles.sectionCard}>
            <Text style={styles.muted}>Loading profile...</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Identity</Text>
              <Text style={styles.label}>Username</Text>
              <TextInput
                value={username}
                editable={canChangeUsername}
                onChangeText={setUsername}
                placeholder="e.g. jireh"
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.input,
                  !canChangeUsername && styles.inputDisabled,
                ]}
                maxLength={24}
                autoCapitalize="none"
              />
              <Text style={styles.fieldHint}>
                {canChangeUsername
                  ? "You can change your username once."
                  : "You already used your one username change."}
              </Text>
              <Text style={[styles.label, styles.bioLabel]}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell people a little about you"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
                maxLength={280}
              />
              <Text style={styles.fieldHint}>{bio.length}/280</Text>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Profile photo</Text>
              <Pressable
                style={[
                  styles.uploadButton,
                  uploadingAvatar && styles.buttonDisabled,
                ]}
                onPress={handleUploadAvatar}
                disabled={uploadingAvatar || saving}
              >
                <Text
                  style={[
                    styles.uploadButtonText,
                    uploadingAvatar && styles.buttonDisabledText,
                  ]}
                >
                  {uploadingAvatar
                    ? "Uploading photo..."
                    : "Upload from device"}
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.sectionCard,
                timezoneMenuOpen && styles.sectionCardElevated,
              ]}
            >
              <Text style={styles.sectionTitle}>Regional settings</Text>
              <Text style={styles.label}>Timezone</Text>
              <View style={styles.timezoneDropdownWrapper}>
                <TimezoneDropdown
                  value={timezone}
                  onChange={setTimezone}
                  placeholderTextColor={theme.colors.textMuted}
                  onOpenChange={setTimezoneMenuOpen}
                  styles={{
                    dropdown: styles.timezoneDropdown,
                    dropdownText: styles.timezoneDropdownText,
                    dropdownChevronIcon: styles.timezoneDropdownChevronIcon,
                    dropdownList: styles.timezoneDropdownList,
                    dropdownListContent: styles.timezoneDropdownListContent,
                    searchInput: styles.timezoneSearchInput,
                    dropdownOption: styles.timezoneDropdownOption,
                    dropdownOptionSelected:
                      styles.timezoneDropdownOptionSelected,
                    dropdownOptionText: styles.timezoneDropdownOptionText,
                    dropdownOptionTextSelected:
                      styles.timezoneDropdownOptionTextSelected,
                    noResults: styles.timezoneNoResults,
                  }}
                />
              </View>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}
            {!!success && <Text style={styles.success}>{success}</Text>}

            <View style={styles.actionsRow}>
              <Pressable
                style={[
                  styles.primaryButton,
                  (saving ||
                    checkingUsername ||
                    uploadingAvatar ||
                    !username.trim() ||
                    !timezone.trim()) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleUpdateProfile}
                disabled={
                  saving ||
                  checkingUsername ||
                  uploadingAvatar ||
                  !username.trim() ||
                  !timezone.trim()
                }
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    (saving ||
                      checkingUsername ||
                      uploadingAvatar ||
                      !username.trim() ||
                      !timezone.trim()) &&
                      styles.buttonDisabledText,
                  ]}
                >
                  {saving
                    ? "Saving profile..."
                    : checkingUsername
                      ? "Checking username..."
                      : "Save changes"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => navigation.navigate("OpenBrainSettings")}
              >
                <Text style={styles.secondaryButtonText}>Back to settings</Text>
              </Pressable>
            </View>
          </>
        )}
      </OpenBrainSettingsLayout>
      <Modal
        visible={showUsernameConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowUsernameConfirm(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <BlurView
            intensity={30}
            tint="dark"
            style={styles.confirmModalBlur}
          />
          <Pressable
            style={styles.confirmModalBackdrop}
            onPress={() => setShowUsernameConfirm(false)}
          />
          <View style={styles.confirmModalCard}>
            <Text style={styles.confirmModalTitle}>
              Confirm username change
            </Text>
            <Text style={styles.confirmModalBody}>
              Your username will change to @{username.trim()}. You can only
              change your username once.
            </Text>
            <View style={styles.confirmModalActions}>
              <Pressable
                style={styles.confirmModalButton}
                onPress={() => setShowUsernameConfirm(false)}
              >
                <Text style={styles.confirmModalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmModalButton,
                  styles.confirmModalButtonPrimary,
                ]}
                onPress={handleConfirmUsernameChange}
              >
                <Text
                  style={[
                    styles.confirmModalButtonText,
                    styles.confirmModalButtonTextPrimary,
                  ]}
                >
                  Confirm
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
