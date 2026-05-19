import { Alert, Platform } from "react-native";

export async function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmStyle = "destructive",
}) {
  if (Platform.OS === "web") {
    if (typeof globalThis.confirm !== "function") return false;
    return globalThis.confirm(`${title}\n\n${message}`);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: confirmStyle, onPress: () => resolve(true) },
    ]);
  });
}
