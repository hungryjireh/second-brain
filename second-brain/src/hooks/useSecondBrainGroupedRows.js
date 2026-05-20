import { useMemo } from "react";
import {
  createDateFormatters,
  formatDateWithFormatters,
  formatRemindAtWithFormatters,
} from "../utils/dateTimeUtils";
import { groupByDate } from "../utils/secondBrainEntryUtils";

export function useSecondBrainGroupedRows({ entries, timezone }) {
  const groupedEntries = useMemo(() => groupByDate(entries), [entries]);
  const dateFormatters = useMemo(
    () => createDateFormatters(timezone),
    [timezone],
  );

  return useMemo(() => {
    const groupOrder = ["Today", "Yesterday", "Earlier this week", "Older"];
    const rows = [];

    for (const group of groupOrder) {
      const items = groupedEntries[group];
      if (!items || items.length === 0) continue;

      rows.push({
        type: "header",
        key: `header-${group}`,
        group,
        count: items.length,
      });

      for (const entry of items) {
        rows.push({
          type: "entry",
          key: `entry-${entry.id}`,
          entry,
          displayDate: formatDateWithFormatters(
            entry.updated_at ?? entry.created_at,
            dateFormatters,
          ),
          displayRemindAt: formatRemindAtWithFormatters(
            entry.remind_at,
            dateFormatters,
          ),
        });
      }
    }

    return rows;
  }, [dateFormatters, groupedEntries]);
}
