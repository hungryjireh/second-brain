import { Text, View } from "react-native";

export default function SecondBrainOfflineBanner({ styles, offlineQueueSize }) {
  return (
    <View testID="offline-banner" style={styles.offlineBanner}>
      <Text style={styles.offlineBannerTitle}>Offline mode</Text>
      <Text style={styles.offlineBannerText}>
        {offlineQueueSize > 0
          ? `${offlineQueueSize} change${offlineQueueSize === 1 ? "" : "s"} queued for sync.`
          : "Showing saved entries. Changes will sync automatically."}
      </Text>
    </View>
  );
}
