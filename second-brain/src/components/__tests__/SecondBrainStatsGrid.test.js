import { fireEvent, render } from "@testing-library/react-native";
import SecondBrainStatsGrid from "../SecondBrainStatsGrid";
import { theme } from "../../theme";

const styles = {
  statsGrid: {},
  statsGridSmall: { id: "small-grid" },
  statCard: {},
  statCardSmall: { id: "small-card" },
  statCardActive: { id: "active-card" },
  statGlow: {},
  statCount: {},
  statLabel: {},
  statLabelSmall: { id: "small-label" },
  statLabelActive: { id: "active-label" },
};

describe("SecondBrainStatsGrid", () => {
  function renderGrid(overrides = {}) {
    const props = {
      styles,
      isSmallScreen: false,
      activeCategory: "",
      counts: {
        reminder: 2,
        todo: 3,
        thought: 4,
      },
      closeOpenActionDrawer: jest.fn(),
      setActiveCategory: jest.fn(),
      ...overrides,
    };

    return { ...render(<SecondBrainStatsGrid {...props} />), props };
  }

  it("renders all stat cards and uses zero fallback for missing count", () => {
    const { getByTestId, getByText } = renderGrid();

    expect(getByTestId("stats-grid")).toBeTruthy();
    expect(getByTestId("stat-card-reminder")).toBeTruthy();
    expect(getByTestId("stat-card-todo")).toBeTruthy();
    expect(getByTestId("stat-card-thought")).toBeTruthy();
    expect(getByTestId("stat-card-note")).toBeTruthy();

    expect(getByText("Reminders")).toBeTruthy();
    expect(getByText("TODOs")).toBeTruthy();
    expect(getByText("Thoughts")).toBeTruthy();
    expect(getByText("Notes")).toBeTruthy();

    expect(getByText("2")).toBeTruthy();
    expect(getByText("3")).toBeTruthy();
    expect(getByText("4")).toBeTruthy();
    expect(getByText("0")).toBeTruthy();
  });

  it("closes open action drawer and toggles selected category when pressed", () => {
    const { getByTestId, props } = renderGrid({ activeCategory: "todo" });

    fireEvent.press(getByTestId("stat-card-todo"));

    expect(props.closeOpenActionDrawer).toHaveBeenCalledTimes(1);
    expect(props.setActiveCategory).toHaveBeenCalledTimes(1);

    const toggleCurrent = props.setActiveCategory.mock.calls[0][0];
    expect(toggleCurrent("todo")).toBe("");
    expect(toggleCurrent("note")).toBe("todo");
  });

  it("sets the selected category when pressing a different stat card", () => {
    const { getByTestId, props } = renderGrid({ activeCategory: "todo" });

    fireEvent.press(getByTestId("stat-card-note"));

    expect(props.closeOpenActionDrawer).toHaveBeenCalledTimes(1);
    expect(props.setActiveCategory).toHaveBeenCalledTimes(1);

    const setNext = props.setActiveCategory.mock.calls[0][0];
    expect(setNext("todo")).toBe("note");
  });

  it("keeps active stat count/label in light text color", () => {
    const { getByText } = renderGrid({
      activeCategory: "todo",
      counts: { reminder: 2, todo: 3, thought: 4, note: 5 },
    });

    const todoLabelStyle = getByText("TODOs").props.style;
    const todoCountStyle = getByText("3").props.style;

    expect(todoLabelStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: theme.colors.textLight }),
      ]),
    );
    expect(todoCountStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: theme.colors.textLight }),
      ]),
    );
  });
});
