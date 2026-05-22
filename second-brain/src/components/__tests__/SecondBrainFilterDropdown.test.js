import { fireEvent, render } from "@testing-library/react-native";
import { Switch, View } from "react-native";
import SecondBrainFilterDropdown from "../SecondBrainFilterDropdown";

const styles = {
  filterSection: {},
  filterSectionOpen: {},
  filterHeaderRow: {},
  filterHeaderRowWithSpacing: {},
  filterDropdownToggle: {},
  filterDropdownToggleOpen: {},
  filterLabel: {},
  filterDropdownChevronIcon: {},
  archivedToggle: {},
  archivedToggleDropdown: {},
  archivedToggleText: {},
  filterDropdownContent: {},
  filterDropdownContentOpen: {},
  clearFiltersButton: {},
  clearFiltersButtonDisabled: {},
  clearFiltersButtonText: {},
  clearFiltersButtonTextDisabled: {},
  filterRow: {},
  filterRowLabel: {},
  pill: {},
  pillActive: {},
  pillDisabled: {},
  pillText: {},
  pillTextActive: {},
  pillTextDisabled: {},
  filterSearchInput: {},
  filterStatusStackItem: {},
  creatingStatusList: {},
  creatingStatusText: {},
  filterDropdownDismissOverlay: {},
};

describe("SecondBrainFilterDropdown", () => {
  function renderDropdown(overrides = {}) {
    const props = {
      styles,
      isSmallScreen: false,
      isFilterDropdownOpen: true,
      setIsFilterDropdownOpen: jest.fn(),
      filterDropdownOpenedAtMs: 0,
      setFilterDropdownOpenedAtMs: jest.fn(),
      closeOpenActionDrawer: jest.fn(),
      showArchived: false,
      setShowArchived: jest.fn(),
      hasActiveFilters: true,
      clearFilters: jest.fn(),
      activePriorityLevel: "",
      setActivePriorityLevel: jest.fn(),
      activeTag: "",
      setActiveTag: jest.fn(),
      globalTags: ["work", "home"],
      tagUsageCounts: new Map([["work", 2]]),
      searchQuery: "",
      setSearchQuery: jest.fn(),
      creatingEntries: [],
      offlineBanner: null,
      errorBanner: null,
      ...overrides,
    };

    return {
      ...render(<SecondBrainFilterDropdown {...props} />),
      props,
    };
  }

  it("toggles dropdown on small screen and records opened timestamp", () => {
    const { getByTestId, props } = renderDropdown({
      isSmallScreen: true,
      isFilterDropdownOpen: false,
    });

    fireEvent.press(getByTestId("filter-dropdown-toggle"));

    expect(props.closeOpenActionDrawer).toHaveBeenCalledTimes(1);
    expect(props.setIsFilterDropdownOpen).toHaveBeenCalledTimes(1);
    const toggleFn = props.setIsFilterDropdownOpen.mock.calls[0][0];
    expect(toggleFn(false)).toBe(true);
    expect(props.setFilterDropdownOpenedAtMs).toHaveBeenCalledTimes(1);
  });

  it("clears filters and closes drawers", () => {
    const { getByText, props } = renderDropdown();

    fireEvent.press(getByText("Clear filters"));

    expect(props.closeOpenActionDrawer).toHaveBeenCalledTimes(1);
    expect(props.clearFilters).toHaveBeenCalledTimes(1);
  });

  it("updates search, archived toggle, and priority selection", () => {
    const { getByPlaceholderText, UNSAFE_getAllByType, getByText, props } =
      renderDropdown();

    fireEvent.changeText(getByPlaceholderText("Search entries..."), "roadmap");
    fireEvent(UNSAFE_getAllByType(Switch)[0], "valueChange", true);
    fireEvent.press(getByText("High (8-10)"));

    expect(props.setSearchQuery).toHaveBeenCalledWith("roadmap");
    expect(props.setShowArchived).toHaveBeenCalledWith(true);
    const priorityFn = props.setActivePriorityLevel.mock.calls[0][0];
    expect(priorityFn("")).toBe("high");
    expect(priorityFn("high")).toBe("");
  });

  it("toggles enabled tags and disables unavailable tags", () => {
    const { getByTestId, props } = renderDropdown({ activeTag: "work" });

    fireEvent.press(getByTestId("tag-filter-work"));
    fireEvent.press(getByTestId("tag-filter-home"));

    expect(props.setActiveTag).toHaveBeenCalledTimes(1);
    const tagFn = props.setActiveTag.mock.calls[0][0];
    expect(tagFn("work")).toBe("");
    expect(tagFn("other")).toBe("work");
  });

  it("renders TAGS label without a global count", () => {
    const { getByText, queryByText } = renderDropdown();

    expect(getByText("TAGS")).toBeTruthy();
    expect(queryByText(/TAGS \(/i)).toBeNull();
  });

  it("does not close from dismiss overlay when opened too recently", () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(150);
    const { UNSAFE_getByProps, props } = renderDropdown({
      isSmallScreen: true,
      isFilterDropdownOpen: true,
      filterDropdownOpenedAtMs: 20,
    });

    fireEvent.press(
      UNSAFE_getByProps({ style: styles.filterDropdownDismissOverlay }),
    );

    expect(props.setIsFilterDropdownOpen).not.toHaveBeenCalledWith(false);
    nowSpy.mockRestore();
  });

  it("closes from dismiss overlay when open long enough", () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(500);
    const { UNSAFE_getByProps, props } = renderDropdown({
      isSmallScreen: true,
      isFilterDropdownOpen: true,
      filterDropdownOpenedAtMs: 100,
    });

    fireEvent.press(
      UNSAFE_getByProps({ style: styles.filterDropdownDismissOverlay }),
    );

    expect(props.setIsFilterDropdownOpen).toHaveBeenCalledWith(false);
    nowSpy.mockRestore();
  });

  it("applies closed and open filter section styles", () => {
    const { UNSAFE_getAllByType, rerender, props } = renderDropdown({
      isFilterDropdownOpen: false,
    });
    const closedRootStyle = UNSAFE_getAllByType(View)[0].props.style;
    expect(closedRootStyle).toContain(styles.filterSection);
    expect(closedRootStyle).not.toContain(styles.filterSectionOpen);

    rerender(<SecondBrainFilterDropdown {...props} isFilterDropdownOpen />);
    const openRootStyle = UNSAFE_getAllByType(View)[0].props.style;
    expect(openRootStyle).toContain(styles.filterSection);
    expect(openRootStyle).toContain(styles.filterSectionOpen);
  });

  it("renders offline and error banners in status stack slots below search", () => {
    const offlineNode = <View testID="offline-slot" />;
    const errorNode = <View testID="error-slot" />;
    const { getByTestId, UNSAFE_getAllByProps } = renderDropdown({
      offlineBanner: offlineNode,
      errorBanner: errorNode,
    });

    expect(getByTestId("offline-slot")).toBeTruthy();
    expect(getByTestId("error-slot")).toBeTruthy();
    expect(
      UNSAFE_getAllByProps({ style: styles.filterStatusStackItem }).length,
    ).toBeGreaterThanOrEqual(2);
  });
});
