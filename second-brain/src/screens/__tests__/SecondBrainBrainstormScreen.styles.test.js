import { StyleSheet } from "react-native";
import styles from "../SecondBrainBrainstormScreen.styles";
import { theme } from "../../theme";

describe("SecondBrainBrainstormScreen styles", () => {
  it("uses bgBase for the full-screen panel background", () => {
    const fullScreenPanel = StyleSheet.flatten(styles.fullScreenPanel);
    expect(fullScreenPanel.backgroundColor).toBe(theme.colors.bgBase);
  });
});
