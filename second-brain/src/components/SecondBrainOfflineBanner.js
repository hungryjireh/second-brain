import { Pressable, Text, View } from "react-native";

export default function SecondBrainOfflineBanner({
  styles,
  offlineQueueSize,
  onPress,
}) {
  const hasQueuedChanges = offlineQueueSize > 0;

  const content = (
    <View testID="offline-banner" style={styles.offlineBanner}>
      <Text style={styles.offlineBannerTitle}>Offline mode</Text>
      {hasQueuedChanges ? (
        <View style={styles.offlineBannerRow}>
          <Text style={styles.offlineBannerText}>
            {`${offlineQueueSize} change${offlineQueueSize === 1 ? "" : "s"} queued for sync.`}
          </Text>
          <Text style={styles.offlineBannerArrow}>→</Text>
        </View>
      ) : (
        <Text style={styles.offlineBannerText}>
          Showing saved entries. Changes will sync automatically.
        </Text>
      )}
    </View>
  );

  if (typeof onPress !== "function") return content;

  return (
    <Pressable
      testID="offline-banner-pressable"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open queued changes"
    >
      {content}
    </Pressable>
  );
}
