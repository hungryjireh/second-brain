import { StyleSheet } from "react-native";
import styles from "../SecondBrainScreen.styles";

describe("SecondBrainScreen responsive styles", () => {
  it("defines a non-wrapping stats grid variant for small screens", () => {
    const smallGrid = StyleSheet.flatten(styles.statsGridSmall);
    expect(smallGrid.flexWrap).toBe("nowrap");
  });

  it("defines compact stat card sizing for small screens", () => {
    const smallCard = StyleSheet.flatten(styles.statCardSmall);
    expect(smallCard.width).toBe("24%");
    expect(smallCard.minWidth).toBe(0);
  });

  it("defines a full-width painted swipe delete background", () => {
    const swipeActionWrap = StyleSheet.flatten(styles.swipeActionWrap);
    const swipeDeleteAction = StyleSheet.flatten(styles.swipeDeleteAction);

    expect(swipeActionWrap.left).toBe(0);
    expect(swipeActionWrap.right).toBe(0);
    expect(swipeActionWrap.backgroundColor).toBe("rgba(220,60,60,0.16)");
    expect(swipeDeleteAction.backgroundColor).toBe("transparent");
  });
});
