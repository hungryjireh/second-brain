import { StyleSheet } from "react-native";
import styles from "../SecondBrainBrainstormTalkScreen.styles";
import { theme } from "../../theme";

describe("SecondBrainBrainstormTalkScreen styles", () => {
  it("keeps controls wrapper centered", () => {
    const controlsWrap = StyleSheet.flatten(styles.controlsWrap);

    expect(controlsWrap.width).toBe("100%");
    expect(controlsWrap.alignItems).toBe("center");
    expect(controlsWrap.justifyContent).toBe("flex-start");
    expect(controlsWrap.position).toBe("absolute");
    expect(controlsWrap.left).toBe(0);
    expect(controlsWrap.right).toBe(0);
    expect(controlsWrap.paddingBottom).toBe(20);
  });

  it("does not add extra top offset on the mic wrapper", () => {
    const micWrap = StyleSheet.flatten(styles.micWrap);

    expect(micWrap.marginTop).toBe(44);
  });

  it("matches save-as-note toggle background to talk screen background", () => {
    const saveAsNoteToggle = StyleSheet.flatten(styles.saveAsNoteToggle);

    expect(saveAsNoteToggle.backgroundColor).toBe("transparent");
  });

  it("centers end button text in both idle and ending states", () => {
    const endButtonText = StyleSheet.flatten(styles.endButtonText);
    const endButtonBusyWrap = StyleSheet.flatten(styles.endButtonBusyWrap);
    const endButtonBusyIndicator = StyleSheet.flatten(
      styles.endButtonBusyIndicator,
    );

    expect(endButtonText.textAlign).toBe("center");
    expect(endButtonBusyWrap.width).toBe("100%");
    expect(endButtonBusyWrap.alignItems).toBe("center");
    expect(endButtonBusyWrap.justifyContent).toBe("center");
    expect(endButtonBusyWrap.position).toBe("relative");
    expect(endButtonBusyIndicator.position).toBe("absolute");
    expect(endButtonBusyIndicator.left).toBe(0);
  });
});
