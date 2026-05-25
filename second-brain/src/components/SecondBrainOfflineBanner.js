import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function SecondBrainOfflineBanner({
  styles,
  offlineQueueSize,
  onBannerPress,
  onSyncPress,
  syncInProgress = false,
}) {
  const hasQueuedChanges = offlineQueueSize > 0;
  const queuedLabel = `${offlineQueueSize} change${offlineQueueSize === 1 ? "" : "s"} queued`;
  const bannerLabel = hasQueuedChanges
    ? `Offline · ${queuedLabel}`
    : "Offline · no changes queued";
  const showSyncArrow = offlineQueueSize >= 1;

  return (
    <View testID="offline-banner" style={styles.offlineBanner}>
      <Pressable
        testID="offline-banner-pressable"
        style={styles.offlineBannerMessagePressable}
        onPress={onBannerPress}
        disabled={typeof onBannerPress !== "function"}
        accessibilityRole="button"
        accessibilityLabel="Open queued changes"
      >
        <View style={styles.offlineBannerDot} />
        <Text style={styles.offlineBannerText}>{bannerLabel}</Text>
      </Pressable>
      <View style={styles.offlineBannerSyncGroup}>
        <Pressable
          testID="offline-banner-sync-button"
          style={[
            styles.offlineBannerSyncButton,
            syncInProgress ? styles.offlineBannerSyncButtonDisabled : null,
          ]}
          onPress={onSyncPress}
          disabled={typeof onSyncPress !== "function" || syncInProgress}
          accessibilityRole="button"
          accessibilityLabel="Sync queued changes"
        >
          {syncInProgress ? (
            <ActivityIndicator
              size="small"
              color="#C8871A"
              testID="offline-banner-sync-loading"
            />
          ) : (
            <Text style={styles.offlineBannerSyncButtonText}>Sync</Text>
          )}
        </Pressable>
        {showSyncArrow ? (
          <Feather
            testID="offline-banner-sync-arrow"
            name="chevron-right"
            size={16}
            style={styles.offlineBannerSyncArrow}
          />
        ) : null}
      </View>
    </View>
  );
}
