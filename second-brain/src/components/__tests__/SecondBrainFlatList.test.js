import { fireEvent, render } from "@testing-library/react-native";
import { ActivityIndicator, Platform } from "react-native";
import SecondBrainFlatList from "../SecondBrainFlatList";

const mockSecondBrainEntryCard = jest.fn();

jest.mock("../SecondBrainEntryCard", () => {
  const { Pressable, Text, View } = require("react-native");
  return function MockSecondBrainEntryCard({ entry, onCloseSwipe }) {
    mockSecondBrainEntryCard(entry?.id);
    return (
      <View>
        <Text>{entry?.title}</Text>
        <Pressable
          testID={`close-swipe-${entry?.id}`}
          onPress={() => onCloseSwipe?.()}
        >
          <Text>Close swipe</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock("../SwipeToDeleteRow", () => {
  const { Pressable, Text, View } = require("react-native");
  return function MockSwipeToDeleteRow({ children, id, onActionPress }) {
    return (
      <View>
        {children}
        <Pressable testID={`swipe-delete-${id}`} onPress={onActionPress}>
          <Text>Delete</Text>
        </Pressable>
      </View>
    );
  };
});

const styles = {
  list: {},
  listContent: {},
  listContentEmpty: {},
  listEmptyCentered: {},
  listEmptyText: {},
  sectionHeaderText: {},
  webEntryRow: {},
};

function createBaseProps(overrides = {}) {
  return {
    groupedRows: [],
    openActionDrawerId: null,
    styles,
    loadingEntries: false,
    onRefresh: jest.fn(),
    listBottomPadding: 24,
    keyExtractor: (item) => item.key,
    renderCell: ({ children }) => children,
    hasActiveFilters: false,
    closeOpenActionDrawer: jest.fn(),
    busyId: null,
    openSwipeId: null,
    setOpenSwipeId: jest.fn(),
    requestDelete: jest.fn(),
    openEntry: jest.fn(),
    startEdit: jest.fn(),
    toggleArchiveWithConfirmation: jest.fn(),
    downloadIcs: jest.fn(),
    handleActionDrawerChange: jest.fn(),
    swipeActionWidth: 92,
    closeAnyActionDrawer: jest.fn(),
    ...overrides,
  };
}

describe("SecondBrainFlatList", () => {
  beforeEach(() => {
    mockSecondBrainEntryCard.mockClear();
  });

  it("shows loading placeholder while entries are loading", () => {
    const { getByText } = render(
      <SecondBrainFlatList {...createBaseProps({ loadingEntries: true })} />,
    );

    expect(getByText("Loading thoughts...")).toBeTruthy();
  });

  it("shows no matching entries state when filters are active", () => {
    const { getByText, queryByText } = render(
      <SecondBrainFlatList {...createBaseProps({ hasActiveFilters: true })} />,
    );

    expect(getByText("No matching entries")).toBeTruthy();
    expect(queryByText("Loading thoughts...")).toBeNull();
  });

  it("renders group header rows from groupedRows", () => {
    const groupedRows = [
      { type: "header", key: "header-today", group: "Today", count: 2 },
    ];

    const { getByText } = render(
      <SecondBrainFlatList {...createBaseProps({ groupedRows })} />,
    );

    expect(getByText("Today · 2")).toBeTruthy();
  });

  it("calls closeOpenActionDrawer when list starts scrolling", () => {
    const closeOpenActionDrawer = jest.fn();
    const groupedRows = [
      {
        type: "entry",
        key: "entry-1",
        entry: { id: 1, title: "First entry", is_archived: false },
      },
    ];

    const { getByText } = render(
      <SecondBrainFlatList
        {...createBaseProps({ groupedRows, closeOpenActionDrawer })}
      />,
    );

    fireEvent(getByText("First entry"), "scrollBeginDrag");
    expect(closeOpenActionDrawer).toHaveBeenCalledTimes(1);
  });

  it("closes swipe state when entry card requests swipe close", () => {
    const setOpenSwipeId = jest.fn();
    const groupedRows = [
      {
        type: "entry",
        key: "entry-1",
        entry: { id: 1, title: "First entry", is_archived: false },
      },
    ];

    const { getByTestId } = render(
      <SecondBrainFlatList
        {...createBaseProps({ groupedRows, setOpenSwipeId })}
      />,
    );

    fireEvent.press(getByTestId("close-swipe-1"));
    expect(setOpenSwipeId).toHaveBeenCalledWith(null);
  });

  it("calls onRefresh when pull-to-refresh is triggered", () => {
    const onRefresh = jest.fn();
    const groupedRows = [
      {
        type: "entry",
        key: "entry-1",
        entry: { id: 1, title: "First entry", is_archived: false },
      },
    ];

    const { getByTestId } = render(
      <SecondBrainFlatList {...createBaseProps({ groupedRows, onRefresh })} />,
    );

    fireEvent(getByTestId("second-brain-flat-list"), "refresh");
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("uses custom pull-refresh UI and disables native spinner while pulling", () => {
    const groupedRows = [
      {
        type: "entry",
        key: "entry-1",
        entry: { id: 1, title: "First entry", is_archived: false },
      },
    ];

    const { getByTestId, UNSAFE_getAllByType } = render(
      <SecondBrainFlatList
        {...createBaseProps({
          groupedRows,
          loadingEntries: true,
          pullRefreshing: true,
        })}
      />,
    );

    const list = getByTestId("second-brain-flat-list");
    expect(list.props.refreshing).toBe(false);
    expect(list.props.scrollEnabled).toBe(false);
    expect(UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(1);

    const hasTopPadding = Array.isArray(list.props.contentContainerStyle)
      ? list.props.contentContainerStyle.some(
          (style) => style && style.paddingTop === 100,
        )
      : false;
    expect(hasTopPadding).toBe(true);
  });

  it("wires swipe delete action to requestDelete for entry rows", () => {
    const requestDelete = jest.fn();
    const groupedRows = [
      {
        type: "entry",
        key: "entry-1",
        entry: { id: 1, title: "First entry", is_archived: false },
      },
    ];

    const { getByTestId } = render(
      <SecondBrainFlatList
        {...createBaseProps({
          groupedRows,
          requestDelete,
        })}
      />,
    );

    fireEvent.press(getByTestId("swipe-delete-1"));
    expect(requestDelete).toHaveBeenCalledWith(1);
  });

  it("sets FlatList virtualization props for performance tuning", () => {
    const { getByTestId } = render(
      <SecondBrainFlatList {...createBaseProps()} />,
    );
    const list = getByTestId("second-brain-flat-list");

    expect(list.props.initialNumToRender).toBe(10);
    expect(list.props.maxToRenderPerBatch).toBe(8);
    expect(list.props.updateCellsBatchingPeriod).toBe(50);
    expect(list.props.windowSize).toBe(9);
    expect(list.props.removeClippedSubviews).toBe(Platform.OS !== "web");
  });

  it("does not rerender entry cards when grouped row objects change but row props stay stable", () => {
    const entry = { id: 1, title: "First entry", is_archived: false };
    const stableProps = createBaseProps();
    const groupedRows = [
      {
        type: "entry",
        key: "entry-1",
        entry,
        displayDate: "May 22",
        displayRemindAt: "09:30",
      },
    ];
    const { rerender } = render(
      <SecondBrainFlatList {...stableProps} groupedRows={groupedRows} />,
    );

    expect(mockSecondBrainEntryCard).toHaveBeenCalledTimes(1);

    const nextGroupedRows = [
      {
        type: "entry",
        key: "entry-1",
        entry,
        displayDate: "May 22",
        displayRemindAt: "09:30",
      },
    ];
    rerender(
      <SecondBrainFlatList {...stableProps} groupedRows={nextGroupedRows} />,
    );

    expect(mockSecondBrainEntryCard).toHaveBeenCalledTimes(1);
  });

  it("rerenders entry cards when row display props change", () => {
    const entry = { id: 1, title: "First entry", is_archived: false };
    const stableProps = createBaseProps();
    const groupedRows = [
      {
        type: "entry",
        key: "entry-1",
        entry,
        displayDate: "May 22",
        displayRemindAt: "09:30",
      },
    ];
    const { rerender } = render(
      <SecondBrainFlatList {...stableProps} groupedRows={groupedRows} />,
    );

    expect(mockSecondBrainEntryCard).toHaveBeenCalledTimes(1);

    const nextGroupedRows = [
      {
        type: "entry",
        key: "entry-1",
        entry,
        displayDate: "May 23",
        displayRemindAt: "09:30",
      },
    ];
    rerender(
      <SecondBrainFlatList {...stableProps} groupedRows={nextGroupedRows} />,
    );

    expect(mockSecondBrainEntryCard).toHaveBeenCalledTimes(2);
  });
});
