import { useMemo } from "react";

function getPriorityLevel(priority) {
  if (priority >= 8) return "high";
  if (priority >= 4) return "medium";
  return "low";
}

function sortTagsByUsage(tags, usageCounts) {
  return [...tags].sort((a, b) => {
    const aHasEntries = usageCounts.has(a);
    const bHasEntries = usageCounts.has(b);
    if (aHasEntries !== bHasEntries) return aHasEntries ? -1 : 1;
    return a.localeCompare(b, "en", { sensitivity: "base" });
  });
}

export function useSecondBrainEntryFiltering({
  entries,
  activeCategory,
  activePriorityLevel,
  activeTag,
  searchQuery,
  showArchived,
  userTags,
  userTagsLoaded,
}) {
  const preparedEntries = useMemo(
    () =>
      entries.map((entry) => {
        const normalizedTags = Array.isArray(entry.tags)
          ? entry.tags.map((tag) => String(tag).trim()).filter(Boolean)
          : [];
        const searchBlob = [
          entry.title,
          entry.summary,
          entry.raw_text,
          entry.content,
          normalizedTags.join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return {
          entry,
          normalizedTags,
          normalizedTagsLower: normalizedTags.map((tag) => tag.toLowerCase()),
          searchBlob,
        };
      }),
    [entries],
  );

  const { counts, visibleEntries, tagUsageCounts } = useMemo(() => {
    const categoryCounts = { reminder: 0, todo: 0, thought: 0, note: 0 };
    const usageCounts = new Map();
    const filteredEntries = [];
    const selectedTag = activeTag.toLowerCase();
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    for (const {
      entry,
      normalizedTags,
      normalizedTagsLower,
      searchBlob,
    } of preparedEntries) {
      const isArchived = Boolean(entry.is_archived);

      if (!isArchived) {
        const key = entry.category;
        if (Object.prototype.hasOwnProperty.call(categoryCounts, key))
          categoryCounts[key] += 1;
      }

      for (const tag of normalizedTags) {
        usageCounts.set(tag, (usageCounts.get(tag) ?? 0) + 1);
      }

      if (showArchived ? !isArchived : isArchived) continue;
      if (activeCategory && entry.category !== activeCategory) continue;
      if (
        activePriorityLevel &&
        getPriorityLevel(entry.priority ?? 0) !== activePriorityLevel
      ) {
        continue;
      }
      if (selectedTag && !normalizedTagsLower.includes(selectedTag)) continue;
      if (
        normalizedSearchQuery &&
        !searchBlob.includes(normalizedSearchQuery)
      ) {
        continue;
      }
      filteredEntries.push(entry);
    }

    return {
      counts: categoryCounts,
      visibleEntries: filteredEntries,
      tagUsageCounts: usageCounts,
    };
  }, [
    preparedEntries,
    showArchived,
    activeCategory,
    activePriorityLevel,
    activeTag,
    searchQuery,
  ]);

  const availableTags = useMemo(() => {
    return Array.from(tagUsageCounts.keys()).sort((a, b) => a.localeCompare(b));
  }, [tagUsageCounts]);

  const globalTags = useMemo(() => {
    if (!userTagsLoaded) return availableTags;
    const sortedUserTags = sortTagsByUsage(userTags, tagUsageCounts);
    return sortedUserTags.length > 0 ? sortedUserTags : availableTags;
  }, [userTagsLoaded, userTags, availableTags, tagUsageCounts]);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        activeCategory ||
        activePriorityLevel ||
        activeTag ||
        searchQuery.trim() ||
        showArchived,
      ),
    [activeCategory, activePriorityLevel, activeTag, searchQuery, showArchived],
  );

  return {
    counts,
    visibleEntries,
    tagUsageCounts,
    globalTags,
    hasActiveFilters,
  };
}
