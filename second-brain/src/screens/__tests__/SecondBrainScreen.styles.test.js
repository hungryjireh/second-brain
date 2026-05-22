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

  it("centers title-row children vertically for title and menu alignment", () => {
    const titleRow = StyleSheet.flatten(styles.entryPanelTitleRow);
    expect(titleRow.alignItems).toBe("center");
  });

  it("keeps typebar tooltips wide enough to avoid character-by-character wrapping", () => {
    const tooltip = StyleSheet.flatten(styles.typebarTooltip);
    const tooltipText = StyleSheet.flatten(styles.typebarTooltipText);

    expect(tooltip.minWidth).toBe(96);
    expect(tooltipText.lineHeight).toBe(14);
    expect(tooltipText.textAlign).toBe("center");
  });

  it("keeps mobile filter controls above dismiss overlay for touch handling", () => {
    const overlay = StyleSheet.flatten(styles.filterDropdownDismissOverlay);
    const headerRow = StyleSheet.flatten(styles.filterHeaderRow);
    const dropdownContentOpen = StyleSheet.flatten(
      styles.filterDropdownContentOpen,
    );
    const searchInput = StyleSheet.flatten(styles.filterSearchInput);

    expect(overlay.zIndex).toBe(1);
    expect(headerRow.zIndex).toBeGreaterThan(overlay.zIndex);
    expect(dropdownContentOpen.zIndex).toBeGreaterThan(overlay.zIndex);
    expect(searchInput.zIndex).toBeGreaterThan(overlay.zIndex);
  });

  it("uses consistent, wider markdown table cell sizing", () => {
    const cell = StyleSheet.flatten(styles.markdownTableCell);

    expect(cell.paddingHorizontal).toBe(12);
    expect(cell.paddingVertical).toBe(10);
    expect(cell.minWidth).toBe(160);
    expect(cell.flexGrow).toBe(1);
    expect(cell.flexShrink).toBe(0);
    expect(cell.flexBasis).toBe(0);
  });

  it("keeps queued edits entry spacing aligned with main entry row spacing", () => {
    const swipeRow = StyleSheet.flatten(styles.swipeRow);
    const queuedEntriesList = StyleSheet.flatten(styles.queuedEntriesList);

    expect(queuedEntriesList.gap).toBe(swipeRow.marginVertical * 2);
  });
});
