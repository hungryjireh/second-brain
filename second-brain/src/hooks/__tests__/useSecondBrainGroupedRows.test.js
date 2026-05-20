import { useEffect } from "react";
import { render } from "@testing-library/react-native";
import { useSecondBrainGroupedRows } from "../useSecondBrainGroupedRows";

describe("useSecondBrainGroupedRows", () => {
  let latestRows = null;

  function Harness({ entries, timezone }) {
    const rows = useSecondBrainGroupedRows({ entries, timezone });
    useEffect(() => {
      latestRows = rows;
    }, [rows]);
    return null;
  }

  beforeEach(() => {
    latestRows = null;
  });

  it("builds header and entry rows for grouped entries", () => {
    const nowUnix = Math.floor(Date.now() / 1000);
    const entries = [
      {
        id: 101,
        created_at: nowUnix,
        updated_at: nowUnix,
        remind_at: nowUnix + 3600,
      },
      {
        id: 102,
        created_at: nowUnix - 86400 * 2,
        updated_at: nowUnix - 86400 * 2,
        remind_at: null,
      },
    ];

    render(<Harness entries={entries} timezone="Asia/Singapore" />);

    const todayHeader = latestRows.find((row) => row.key === "header-Today");
    const earlierHeader = latestRows.find(
      (row) => row.key === "header-Earlier this week",
    );
    const todayEntry = latestRows.find((row) => row.key === "entry-101");

    expect(todayHeader).toEqual(
      expect.objectContaining({ type: "header", count: 1 }),
    );
    expect(earlierHeader).toEqual(
      expect.objectContaining({ type: "header", count: 1 }),
    );
    expect(todayEntry.displayDate).toContain("Today");
    expect(todayEntry.displayRemindAt).toBeTruthy();
  });
});
