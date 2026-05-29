import { StyleSheet } from "react-native";
import styles from "../../components/SecondBrainMicrophoneButton.styles";
import { theme } from "../../theme";

describe("SecondBrainMicrophoneButton styles", () => {
  it("uses brand color for mic button surface and shadow", () => {
    const micButton = StyleSheet.flatten(styles.micButton);

    expect(micButton.backgroundColor).toBe(theme.colors.brand);
    expect(micButton.shadowColor).toBe(theme.colors.brand);
  });

  it("uses brand color for both concentric glow circles", () => {
    const glowOuter = StyleSheet.flatten(styles.micGlowOuter);
    const glowInner = StyleSheet.flatten(styles.micGlowInner);

    expect(glowOuter.backgroundColor).toBe(theme.colors.brand);
    expect(glowOuter.opacity).toBe(0.16);
    expect(glowInner.backgroundColor).toBe(theme.colors.brand);
    expect(glowInner.opacity).toBe(0.24);
  });
});
