import { fireEvent, render } from "@testing-library/react-native";
import { Text, View } from "react-native";
import SecondBrainFlatList from "../SecondBrainFlatList";

const styles = {
  list: {},
  listContent: {},
  listContentEmpty: {},
  listEmptyCentered: {},
  listEmptyText: {},
};

function renderListItem({ item }) {
  return (
    <View>
      <Text>{item.title}</Text>
    </View>
  );
}

describe("SecondBrainFlatList", () => {
  it("shows loading placeholder while entries are loading", () => {
    const { getByText } = render(
      <SecondBrainFlatList
        groupedRows={[]}
        openActionDrawerId={null}
        styles={styles}
        loadingEntries
        listBottomPadding={24}
        keyExtractor={(item) => item.key}
        renderCell={({ children }) => children}
        renderListItem={renderListItem}
        hasActiveFilters={false}
        closeOpenActionDrawer={jest.fn()}
      />,
    );

    expect(getByText("Loading thoughts...")).toBeTruthy();
  });

  it("shows no matching entries state when filters are active", () => {
    const { getByText, queryByText } = render(
      <SecondBrainFlatList
        groupedRows={[]}
        openActionDrawerId={null}
        styles={styles}
        loadingEntries={false}
        listBottomPadding={24}
        keyExtractor={(item) => item.key}
        renderCell={({ children }) => children}
        renderListItem={renderListItem}
        hasActiveFilters
        closeOpenActionDrawer={jest.fn()}
      />,
    );

    expect(getByText("No matching entries")).toBeTruthy();
    expect(queryByText("Loading thoughts...")).toBeNull();
  });

  it("calls closeOpenActionDrawer when list starts scrolling", () => {
    const closeOpenActionDrawer = jest.fn();
    const groupedRows = [{ key: "entry-1", title: "First entry" }];

    const { getByText } = render(
      <SecondBrainFlatList
        groupedRows={groupedRows}
        openActionDrawerId={null}
        styles={styles}
        loadingEntries={false}
        listBottomPadding={24}
        keyExtractor={(item) => item.key}
        renderCell={({ children }) => children}
        renderListItem={renderListItem}
        hasActiveFilters={false}
        closeOpenActionDrawer={closeOpenActionDrawer}
      />,
    );

    fireEvent(getByText("First entry"), "scrollBeginDrag");
    expect(closeOpenActionDrawer).toHaveBeenCalledTimes(1);
  });
});
