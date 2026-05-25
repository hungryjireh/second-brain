import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../theme";

const PRIORITY_LEVELS = [
  { key: "high", label: "High (8-10)" },
  { key: "medium", label: "Medium (4-7)" },
  { key: "low", label: "Low (0-3)" },
];

function getTagUsageCount(tagUsageCounts, tag) {
  if (tagUsageCounts.has(tag)) return tagUsageCounts.get(tag);
  const normalizedTag = tag.toLowerCase();
  for (const [usageTag, count] of tagUsageCounts.entries()) {
    if (usageTag.toLowerCase() === normalizedTag) return count;
  }
  return 0;
}

export default function SecondBrainFilterDropdown({
  styles,
  isSmallScreen,
  isFilterDropdownOpen,
  setIsFilterDropdownOpen,
  filterDropdownOpenedAtMs,
  setFilterDropdownOpenedAtMs,
  closeOpenActionDrawer,
  showArchived,
  setShowArchived,
  hasActiveFilters,
  activeFilterCount,
  clearFilters,
  activePriorityLevel,
  setActivePriorityLevel,
  activeTag,
  setActiveTag,
  globalTags,
  tagUsageCounts,
  searchQuery,
  setSearchQuery,
  creatingEntries,
  offlineBanner,
  errorBanner,
}) {
  const toggleFilters = () => {
    closeOpenActionDrawer();
    setIsFilterDropdownOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        setFilterDropdownOpenedAtMs(Date.now());
      }
      return nextOpen;
    });
  };

  return (
    <View
      style={[
        styles.filterSection,
        isFilterDropdownOpen && styles.filterSectionOpen,
      ]}
    >
      <View style={styles.filterSearchRow}>
        <View style={styles.filterSearchInputWrap}>
          <Feather name="search" size={24} style={styles.filterSearchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={closeOpenActionDrawer}
            placeholder="Search entries..."
            placeholderTextColor={theme.colors.textMuted}
            style={styles.filterSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        {isSmallScreen ? (
          <Pressable
            testID="filter-dropdown-toggle"
            style={[
              styles.filterDropdownIconButton,
              hasActiveFilters && styles.filterDropdownIconButtonActive,
              isFilterDropdownOpen && styles.filterDropdownToggleOpen,
            ]}
            onPress={toggleFilters}
          >
            <Feather
              name="sliders"
              size={22}
              style={[
                styles.filterDropdownIconButtonIcon,
                hasActiveFilters && styles.filterDropdownIconButtonIconActive,
              ]}
            />
            {activeFilterCount > 0 ? (
              <View style={styles.filterDropdownCountBadge}>
                <Text style={styles.filterDropdownCountBadgeText}>
                  {activeFilterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
      <View
        style={[
          styles.filterHeaderRow,
          !isSmallScreen && styles.filterHeaderRowWithSpacing,
        ]}
      >
        {!isSmallScreen ? (
          <>
            <Text style={styles.filterLabel}>FILTER</Text>
            <View style={styles.archivedToggle}>
              <Text style={styles.archivedToggleText}>Show Archived/Done</Text>
              <Switch
                value={showArchived}
                onValueChange={(next) => {
                  closeOpenActionDrawer();
                  setShowArchived(next);
                }}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.brand,
                }}
                thumbColor={theme.colors.bg}
                ios_backgroundColor={theme.colors.border}
              />
            </View>
          </>
        ) : null}
      </View>

      {isFilterDropdownOpen ? (
        <View
          style={[
            styles.filterDropdownContent,
            styles.filterDropdownContentOpen,
          ]}
        >
          <Pressable
            style={[
              styles.clearFiltersButton,
              !hasActiveFilters && styles.clearFiltersButtonDisabled,
            ]}
            onPress={() => {
              closeOpenActionDrawer();
              clearFilters();
            }}
            disabled={!hasActiveFilters}
          >
            <Text
              style={[
                styles.clearFiltersButtonText,
                !hasActiveFilters && styles.clearFiltersButtonTextDisabled,
              ]}
            >
              Clear filters
            </Text>
          </Pressable>
          {isSmallScreen ? (
            <View
              style={[styles.archivedToggle, styles.archivedToggleDropdown]}
            >
              <Text style={styles.archivedToggleText}>Show Archived/Done</Text>
              <Switch
                value={showArchived}
                onValueChange={(next) => {
                  closeOpenActionDrawer();
                  setShowArchived(next);
                }}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.brand,
                }}
                thumbColor={theme.colors.bg}
                ios_backgroundColor={theme.colors.border}
              />
            </View>
          ) : null}
          <View style={styles.filterRow}>
            <Text style={styles.filterRowLabel}>PRIORITY</Text>
            {PRIORITY_LEVELS.map((level) => {
              const isActive = activePriorityLevel === level.key;
              return (
                <Pressable
                  key={level.key}
                  style={[
                    styles.pill,
                    styles.filterDropdownPill,
                    isActive && styles.pillActive,
                  ]}
                  onPress={() => {
                    closeOpenActionDrawer();
                    setActivePriorityLevel((prev) =>
                      prev === level.key ? "" : level.key,
                    );
                  }}
                >
                  <Text
                    style={[styles.pillText, isActive && styles.pillTextActive]}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterRowLabel}>TAGS</Text>
            {globalTags.map((tag) => {
              const isActive = activeTag.toLowerCase() === tag.toLowerCase();
              const usageCount = getTagUsageCount(tagUsageCounts, tag);
              const isDisabled = usageCount <= 0;
              return (
                <Pressable
                  key={tag}
                  testID={`tag-filter-${tag.toLowerCase()}`}
                  style={[
                    styles.pill,
                    styles.filterDropdownPill,
                    isActive && styles.pillActive,
                    isDisabled && styles.pillDisabled,
                  ]}
                  disabled={isDisabled}
                  onPress={() => {
                    closeOpenActionDrawer();
                    setActiveTag((prev) =>
                      prev.toLowerCase() === tag.toLowerCase() ? "" : tag,
                    );
                  }}
                >
                  <View style={styles.tagFilterPillContent}>
                    <Text
                      style={[
                        styles.pillText,
                        isActive && styles.pillTextActive,
                        isDisabled && styles.pillTextDisabled,
                      ]}
                    >{`#${tag}`}</Text>
                    <View
                      testID={`tag-filter-count-${tag.toLowerCase()}`}
                      style={[
                        styles.tagFilterCountBadge,
                        isActive && styles.tagFilterCountBadgeActive,
                        isDisabled && styles.tagFilterCountBadgeDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagFilterCountText,
                          isActive && styles.tagFilterCountTextActive,
                          isDisabled && styles.tagFilterCountTextDisabled,
                        ]}
                      >
                        {usageCount}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {offlineBanner ? (
        <View style={styles.filterStatusStackItem}>{offlineBanner}</View>
      ) : null}
      {errorBanner ? (
        <View style={styles.filterStatusStackItem}>{errorBanner}</View>
      ) : null}
      {creatingEntries.length ? (
        <View style={styles.creatingStatusList}>
          {creatingEntries.map((item) => (
            <Text
              key={item.id}
              style={styles.creatingStatusText}
            >{`Creating ${item.title}...`}</Text>
          ))}
        </View>
      ) : null}
      {isSmallScreen && isFilterDropdownOpen ? (
        <Pressable
          style={styles.filterDropdownDismissOverlay}
          onPress={() => {
            const elapsedMs = Date.now() - filterDropdownOpenedAtMs;
            if (elapsedMs < 180) return;
            setIsFilterDropdownOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}
