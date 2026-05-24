import { fireEvent, render } from "@testing-library/react-native";
import SecondBrainEntryCard from "../SecondBrainEntryCard";
import { theme as appTheme } from "../../theme";

const styles = {
  card: {},
  cardTopRow: {},
  cardMainCol: {},
  cardMetaRow: {},
  cardIcon: {},
  priorityText: {},
  cardTitle: {},
  cardTitleBlock: {},
  cardBody: {},
  cardActionCol: {},
  cardActionRow: {},
  mobileCategoryActionRow: {},
  mobileActionDrawerWrap: {},
  mobileActionTrigger: {},
  mobileActionTriggerText: {},
  mobileActionDrawer: {},
  mobileActionDrawerItem: {},
  mobileActionDrawerText: {},
  mobileActionDrawerDeleteText: {},
  secondaryButton: {},
  secondaryButtonText: {},
  tagPill: {},
  tagPillText: {},
  deleteButton: {},
  deleteButtonConfirm: {},
  deleteText: {},
  deleteTextConfirm: {},
  metaInfoRow: {},
  reminderMetaPill: {},
  reminderMetaText: {},
  metaDot: {},
  metaText: {},
  tagsRow: {},
  itemTagPill: {},
  itemTagText: {},
};

const theme = {
  colors: {
    textSecondary: "#777",
  },
};

describe("SecondBrainEntryCard", () => {
  it("renders entry content and calls handlers", () => {
    const onOpenEntry = jest.fn();
    const onCloseSwipe = jest.fn();
    const onStartEdit = jest.fn();
    const onToggleArchive = jest.fn();
    const onDownloadIcs = jest.fn();
    const onRequestDelete = jest.fn();

    const entry = {
      id: 7,
      category: "reminder",
      title: "Pay bill",
      summary: "Monthly dues",
      priority: 8,
      remind_at: 1,
      created_at: 1,
      tags: ["finance"],
      is_archived: false,
    };

    const { getByText } = render(
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        timezone="UTC"
        isBusy={false}
        isSwipeOpen={false}
        isDeleteConfirm={false}
        onOpenEntry={onOpenEntry}
        onCloseSwipe={onCloseSwipe}
        onStartEdit={onStartEdit}
        onToggleArchive={onToggleArchive}
        onDownloadIcs={onDownloadIcs}
        onRequestDelete={onRequestDelete}
        formatRemindAt={() => "2026-05-09 10:00"}
        formatDate={() => "2026-05-09"}
      />,
    );

    expect(getByText("Pay bill")).toBeTruthy();
    expect(getByText("Monthly dues")).toBeTruthy();
    expect(getByText("Mark Done")).toBeTruthy();
    expect(getByText("#finance")).toBeTruthy();

    fireEvent.press(getByText("Edit"), { stopPropagation: jest.fn() });
    fireEvent.press(getByText("Mark Done"), { stopPropagation: jest.fn() });
    fireEvent.press(getByText("Add to Calendar"), {
      stopPropagation: jest.fn(),
    });

    expect(onStartEdit).toHaveBeenCalledWith(entry);
    expect(onToggleArchive).toHaveBeenCalledWith(entry);
    expect(onDownloadIcs).toHaveBeenCalledWith(7);

    fireEvent.press(getByText("Pay bill"));
    expect(onOpenEntry).toHaveBeenCalledWith(entry);
    expect(onCloseSwipe).not.toHaveBeenCalled();
  });

  it("closes open menu from another card before navigating", () => {
    const onOpenEntry = jest.fn();
    const onCloseAnyActionDrawer = jest.fn();
    const entry = {
      id: 8,
      category: "note",
      title: "Inbox",
      summary: "Quick note",
      priority: 2,
      tags: [],
      is_archived: false,
    };

    const { getByText } = render(
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        isBusy={false}
        isSwipeOpen={false}
        isDeleteConfirm={false}
        onOpenEntry={onOpenEntry}
        onCloseSwipe={jest.fn()}
        onStartEdit={jest.fn()}
        onToggleArchive={jest.fn()}
        onDownloadIcs={jest.fn()}
        onRequestDelete={jest.fn()}
        hasOpenActionDrawer
        isActionDrawerActive={false}
        onCloseAnyActionDrawer={onCloseAnyActionDrawer}
      />,
    );

    fireEvent.press(getByText("Inbox"));
    expect(onCloseAnyActionDrawer).toHaveBeenCalledTimes(1);
    expect(onOpenEntry).not.toHaveBeenCalled();
  });

  it("opens action menu from 3-dots on mobile layout", () => {
    const onActionDrawerChange = jest.fn();
    const entry = {
      id: 11,
      category: "note",
      title: "Mobile menu",
      summary: "Tap trigger",
      priority: 1,
      tags: [],
      is_archived: false,
    };

    const { getByTestId } = render(
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        isBusy={false}
        isSwipeOpen={false}
        isDeleteConfirm={false}
        onOpenEntry={jest.fn()}
        onCloseSwipe={jest.fn()}
        onStartEdit={jest.fn()}
        onToggleArchive={jest.fn()}
        onDownloadIcs={jest.fn()}
        onRequestDelete={jest.fn()}
        onActionDrawerChange={onActionDrawerChange}
        isActionDrawerActive={false}
        hasOpenActionDrawer={false}
        isSmallScreenOverride
      />,
    );

    fireEvent.press(getByTestId("entry-action-trigger-11"));
    expect(onActionDrawerChange).toHaveBeenCalledWith(11, true);
  });

  it("closes its open mobile action menu when tapping card body", () => {
    const onActionDrawerChange = jest.fn();
    const entry = {
      id: 21,
      category: "note",
      title: "Body tap closes",
      summary: "Outside action row tap",
      priority: 1,
      tags: [],
      is_archived: false,
    };

    const { getByText } = render(
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        isBusy={false}
        isSwipeOpen={false}
        isDeleteConfirm={false}
        onOpenEntry={jest.fn()}
        onCloseSwipe={jest.fn()}
        onStartEdit={jest.fn()}
        onToggleArchive={jest.fn()}
        onDownloadIcs={jest.fn()}
        onRequestDelete={jest.fn()}
        onActionDrawerChange={onActionDrawerChange}
        isActionDrawerActive
        hasOpenActionDrawer
        isSmallScreenOverride
      />,
    );

    fireEvent.press(getByText("Outside action row tap"));
    expect(onActionDrawerChange).toHaveBeenCalledWith(21, false);
  });

  it("hides priority when hidePriority is true", () => {
    const entry = {
      id: 31,
      category: "note",
      title: "No priority",
      summary: "Priority hidden",
      priority: 9,
      tags: [],
      is_archived: false,
    };

    const { queryByText } = render(
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        isBusy={false}
        isSwipeOpen={false}
        isDeleteConfirm={false}
        onOpenEntry={jest.fn()}
        onCloseSwipe={jest.fn()}
        onStartEdit={jest.fn()}
        onToggleArchive={jest.fn()}
        onDownloadIcs={jest.fn()}
        onRequestDelete={jest.fn()}
        hidePriority
      />,
    );

    expect(queryByText("P9")).toBeNull();
  });

  it("hides mobile menu button when hideMenuButton is true", () => {
    const entry = {
      id: 41,
      category: "note",
      title: "No menu",
      summary: "Menu hidden",
      priority: 1,
      tags: [],
      is_archived: false,
    };

    const { queryByTestId } = render(
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        isBusy={false}
        isSwipeOpen={false}
        isDeleteConfirm={false}
        onOpenEntry={jest.fn()}
        onCloseSwipe={jest.fn()}
        onStartEdit={jest.fn()}
        onToggleArchive={jest.fn()}
        onDownloadIcs={jest.fn()}
        onRequestDelete={jest.fn()}
        isSmallScreenOverride
        hideMenuButton
      />,
    );

    expect(queryByTestId("entry-action-trigger-41")).toBeNull();
  });

  it("applies category-colored left border on the entry card", () => {
    const entry = {
      id: 51,
      category: "note",
      title: "Border test",
      summary: "Check left border color",
      priority: 0,
      tags: [],
      is_archived: false,
    };

    const { getByTestId } = render(
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        isBusy={false}
        isSwipeOpen={false}
        isDeleteConfirm={false}
        onOpenEntry={jest.fn()}
        onCloseSwipe={jest.fn()}
        onStartEdit={jest.fn()}
        onToggleArchive={jest.fn()}
        onDownloadIcs={jest.fn()}
        onRequestDelete={jest.fn()}
      />,
    );

    expect(getByTestId("entry-card-51")).toHaveStyle({
      borderLeftWidth: 4,
      borderLeftColor: appTheme.colors.noteTagText,
    });
  });

  it("shows only the maximum number of tags that fit one row", () => {
    const entry = {
      id: 61,
      category: "note",
      title: "Tag fitting",
      summary: "Tag fitting summary",
      priority: 0,
      tags: ["one", "two", "three"],
      is_archived: false,
    };

    const { getByTestId, queryByText } = render(
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        isBusy={false}
        isSwipeOpen={false}
        isDeleteConfirm={false}
        onOpenEntry={jest.fn()}
        onCloseSwipe={jest.fn()}
        onStartEdit={jest.fn()}
        onToggleArchive={jest.fn()}
        onDownloadIcs={jest.fn()}
        onRequestDelete={jest.fn()}
      />,
    );

    fireEvent(getByTestId("entry-tags-row-61"), "layout", {
      nativeEvent: { layout: { width: 74 } },
    });
    fireEvent(getByTestId("entry-tag-61-0"), "layout", {
      nativeEvent: { layout: { width: 30 } },
    });
    fireEvent(getByTestId("entry-tag-61-1"), "layout", {
      nativeEvent: { layout: { width: 30 } },
    });
    fireEvent(getByTestId("entry-tag-61-2"), "layout", {
      nativeEvent: { layout: { width: 30 } },
    });

    expect(queryByText("#one")).toBeTruthy();
    expect(queryByText("#two")).toBeTruthy();
    expect(queryByText("#three")).toBeNull();
  });

  it("keeps all tags visible when all fit on one row", () => {
    const entry = {
      id: 62,
      category: "note",
      title: "All tags fit",
      summary: "All tags fit summary",
      priority: 0,
      tags: ["one", "two", "three"],
      is_archived: false,
    };

    const { getByTestId, queryByText } = render(
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        isBusy={false}
        isSwipeOpen={false}
        isDeleteConfirm={false}
        onOpenEntry={jest.fn()}
        onCloseSwipe={jest.fn()}
        onStartEdit={jest.fn()}
        onToggleArchive={jest.fn()}
        onDownloadIcs={jest.fn()}
        onRequestDelete={jest.fn()}
      />,
    );

    fireEvent(getByTestId("entry-tags-row-62"), "layout", {
      nativeEvent: { layout: { width: 120 } },
    });
    fireEvent(getByTestId("entry-tag-62-0"), "layout", {
      nativeEvent: { layout: { width: 30 } },
    });
    fireEvent(getByTestId("entry-tag-62-1"), "layout", {
      nativeEvent: { layout: { width: 30 } },
    });
    fireEvent(getByTestId("entry-tag-62-2"), "layout", {
      nativeEvent: { layout: { width: 30 } },
    });

    expect(queryByText("#one")).toBeTruthy();
    expect(queryByText("#two")).toBeTruthy();
    expect(queryByText("#three")).toBeTruthy();
  });

  it("shows only one tag when only one can fit", () => {
    const entry = {
      id: 63,
      category: "note",
      title: "One tag fits",
      summary: "One tag fits summary",
      priority: 0,
      tags: ["one", "two", "three"],
      is_archived: false,
    };

    const { getByTestId, queryByText } = render(
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        isBusy={false}
        isSwipeOpen={false}
        isDeleteConfirm={false}
        onOpenEntry={jest.fn()}
        onCloseSwipe={jest.fn()}
        onStartEdit={jest.fn()}
        onToggleArchive={jest.fn()}
        onDownloadIcs={jest.fn()}
        onRequestDelete={jest.fn()}
      />,
    );

    fireEvent(getByTestId("entry-tags-row-63"), "layout", {
      nativeEvent: { layout: { width: 35 } },
    });
    fireEvent(getByTestId("entry-tag-63-0"), "layout", {
      nativeEvent: { layout: { width: 30 } },
    });
    fireEvent(getByTestId("entry-tag-63-1"), "layout", {
      nativeEvent: { layout: { width: 30 } },
    });
    fireEvent(getByTestId("entry-tag-63-2"), "layout", {
      nativeEvent: { layout: { width: 30 } },
    });

    expect(queryByText("#one")).toBeTruthy();
    expect(queryByText("#two")).toBeNull();
    expect(queryByText("#three")).toBeNull();
  });
});
