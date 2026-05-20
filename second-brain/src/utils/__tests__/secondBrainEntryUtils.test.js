import { groupByDate, sortEntriesByUpdatedAt } from "../secondBrainEntryUtils";

describe("secondBrainEntryUtils", () => {
  it("sorts entries by updated_at descending with created_at fallback", () => {
    const sorted = sortEntriesByUpdatedAt([
      { id: 1, created_at: 100, updated_at: 120 },
      { id: 2, created_at: 200 },
      { id: 3, created_at: 90, updated_at: 180 },
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual([2, 3, 1]);
  });

  it("uses id as tiebreaker when timestamps are identical", () => {
    const sorted = sortEntriesByUpdatedAt([
      { id: 1, created_at: 100 },
      { id: 3, created_at: 100 },
      { id: 2, created_at: 100 },
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual([3, 2, 1]);
  });

  it("groups entries into today, yesterday, earlier this week, and older", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-20T12:00:00.000Z"));

    const nowUnix = Math.floor(
      new Date("2026-05-20T08:00:00.000Z").getTime() / 1000,
    );
    const yesterdayUnix = Math.floor(
      new Date("2026-05-19T08:00:00.000Z").getTime() / 1000,
    );
    const weekUnix = Math.floor(
      new Date("2026-05-15T08:00:00.000Z").getTime() / 1000,
    );
    const olderUnix = Math.floor(
      new Date("2026-05-10T08:00:00.000Z").getTime() / 1000,
    );

    const grouped = groupByDate([
      { id: 1, created_at: nowUnix },
      { id: 2, created_at: yesterdayUnix },
      { id: 3, created_at: weekUnix },
      { id: 4, created_at: olderUnix },
    ]);

    expect(grouped.Today?.map((entry) => entry.id)).toEqual([1]);
    expect(grouped.Yesterday?.map((entry) => entry.id)).toEqual([2]);
    expect(grouped["Earlier this week"]?.map((entry) => entry.id)).toEqual([3]);
    expect(grouped.Older?.map((entry) => entry.id)).toEqual([4]);

    jest.useRealTimers();
  });
});
