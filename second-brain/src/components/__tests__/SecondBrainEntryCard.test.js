import { fireEvent, render } from "@testing-library/react-native";
import SecondBrainEntryCard from "../SecondBrainEntryCard";

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
});
