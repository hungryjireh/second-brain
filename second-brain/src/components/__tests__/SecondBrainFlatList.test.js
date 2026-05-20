import { fireEvent, render } from "@testing-library/react-native";
import SecondBrainFlatList from "../SecondBrainFlatList";

jest.mock("../SecondBrainEntryCard", () => {
  const { Pressable, Text, View } = require("react-native");
  return function MockSecondBrainEntryCard({ entry, onCloseSwipe }) {
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
  const { View } = require("react-native");
  return function MockSwipeToDeleteRow({ children }) {
    return <View>{children}</View>;
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
});
