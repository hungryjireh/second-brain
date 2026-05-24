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
  return function MockSwipeToDeleteRow({
    children,
    id,
    onActionPress,
    onSwipeGestureStart,
    onSwipeGestureEnd,
  }) {
    return (
      <View>
        {children}
        <Pressable testID={`swipe-delete-${id}`} onPress={onActionPress}>
          <Text>Delete</Text>
        </Pressable>
        <Pressable
          testID={`swipe-start-${id}`}
          onPress={() => onSwipeGestureStart?.()}
        >
          <Text>Swipe start</Text>
        </Pressable>
        <Pressable
          testID={`swipe-end-${id}`}
          onPress={() => onSwipeGestureEnd?.()}
        >
          <Text>Swipe end</Text>
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
    expect(list.props.refreshing).toBe(true);
    expect(list.props.scrollEnabled).toBe(false);
    expect(UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(1);

    const hasTopPadding = Array.isArray(list.props.contentContainerStyle)
      ? list.props.contentContainerStyle.some(
          (style) => style && style.paddingTop === 100,
        )
      : false;
    expect(hasTopPadding).toBe(true);
  });

  it("does not show native refresh spinner during non-pull background loads", () => {
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
          loadingEntries: true,
          pullRefreshing: false,
        })}
      />,
    );

    const list = getByTestId("second-brain-flat-list");
    expect(list.props.refreshing).toBe(false);
  });

  it("keeps native refresh spinner off when returning with rows during background reload", () => {
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
          loadingEntries: true,
          pullRefreshing: false,
        })}
      />,
    );

    const list = getByTestId("second-brain-flat-list");
    expect(list.props.refreshing).toBe(false);
  });

  it("disables FlatList scrolling while swipe gesture is active and re-enables after gesture end", () => {
    const groupedRows = [
      {
        type: "entry",
        key: "entry-1",
        entry: { id: 1, title: "First entry", is_archived: false },
      },
    ];

    const { getByTestId } = render(
      <SecondBrainFlatList {...createBaseProps({ groupedRows })} />,
    );

    const list = getByTestId("second-brain-flat-list");
    expect(list.props.scrollEnabled).toBe(true);

    fireEvent.press(getByTestId("swipe-start-1"));
    expect(getByTestId("second-brain-flat-list").props.scrollEnabled).toBe(
      false,
    );

    fireEvent.press(getByTestId("swipe-end-1"));
    expect(getByTestId("second-brain-flat-list").props.scrollEnabled).toBe(
      true,
    );
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

  it("only rerenders rows whose action drawer active state changes", () => {
    const firstEntry = { id: 1, title: "First entry", is_archived: false };
    const secondEntry = { id: 2, title: "Second entry", is_archived: false };
    const stableProps = createBaseProps();
    const groupedRows = [
      {
        type: "entry",
        key: "entry-1",
        entry: firstEntry,
        displayDate: "May 22",
        displayRemindAt: "09:30",
      },
      {
        type: "entry",
        key: "entry-2",
        entry: secondEntry,
        displayDate: "May 22",
        displayRemindAt: "10:30",
      },
    ];

    const { rerender } = render(
      <SecondBrainFlatList
        {...stableProps}
        groupedRows={groupedRows}
        openActionDrawerId={null}
      />,
    );

    expect(mockSecondBrainEntryCard).toHaveBeenCalledTimes(2);

    rerender(
      <SecondBrainFlatList
        {...stableProps}
        groupedRows={groupedRows}
        openActionDrawerId={1}
      />,
    );

    expect(mockSecondBrainEntryCard).toHaveBeenCalledTimes(3);
    expect(mockSecondBrainEntryCard).toHaveBeenLastCalledWith(1);

    rerender(
      <SecondBrainFlatList
        {...stableProps}
        groupedRows={groupedRows}
        openActionDrawerId={2}
      />,
    );

    expect(mockSecondBrainEntryCard).toHaveBeenCalledTimes(5);
    expect(mockSecondBrainEntryCard).toHaveBeenNthCalledWith(4, 1);
    expect(mockSecondBrainEntryCard).toHaveBeenNthCalledWith(5, 2);
  });
});
