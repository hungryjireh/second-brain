import { useEffect } from "react";
import { render } from "@testing-library/react-native";
import { useSecondBrainEntryFiltering } from "../useSecondBrainEntryFiltering";

describe("useSecondBrainEntryFiltering", () => {
  let latestValue = null;

  function Harness(props) {
    const value = useSecondBrainEntryFiltering(props);
    useEffect(() => {
      latestValue = value;
    }, [value]);
    return null;
  }

  beforeEach(() => {
    latestValue = null;
  });

  it("derives counts, visible entries, tags, and active-filter state", () => {
    const entries = [
      {
        id: 1,
        category: "note",
        priority: 8,
        is_archived: false,
        title: "Roadmap",
        summary: "Q3 planning",
        tags: ["Work", "Planning"],
      },
      {
        id: 2,
        category: "todo",
        priority: 2,
        is_archived: true,
        title: "Buy milk",
        tags: ["home"],
      },
      {
        id: 3,
        category: "reminder",
        priority: 5,
        is_archived: false,
        title: "Dentist",
        tags: ["Health", "work"],
      },
    ];

    render(
      <Harness
        entries={entries}
        activeCategory="note"
        activePriorityLevel="high"
        activeTag="work"
        searchQuery="road"
        showArchived={false}
        userTags={["health", "ideas", "work"]}
        userTagsLoaded
      />,
    );

    expect(latestValue.counts).toEqual({
      reminder: 1,
      todo: 0,
      thought: 0,
      note: 1,
    });
    expect(latestValue.visibleEntries.map((entry) => entry.id)).toEqual([1]);
    expect(latestValue.hasActiveFilters).toBe(true);
    expect(latestValue.tagUsageCounts.get("Work")).toBe(1);
    expect(latestValue.tagUsageCounts.get("work")).toBe(1);
    expect(latestValue.globalTags).toEqual(["work", "health", "ideas"]);
  });

  it("falls back to available tags when user tags are not loaded", () => {
    const entries = [
      {
        id: 10,
        category: "thought",
        priority: 4,
        is_archived: false,
        title: "Idea",
        tags: ["zeta", "alpha"],
      },
    ];

    render(
      <Harness
        entries={entries}
        activeCategory=""
        activePriorityLevel=""
        activeTag=""
        searchQuery=""
        showArchived={false}
        userTags={[]}
        userTagsLoaded={false}
      />,
    );

    expect(latestValue.globalTags).toEqual(["alpha", "zeta"]);
    expect(latestValue.hasActiveFilters).toBe(false);
  });
});
