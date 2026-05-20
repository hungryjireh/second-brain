import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../theme";
import { MAX_USER_TAGS } from "../constants/tags";
import { countBillableGlobalTags } from "../utils/secondBrainTagUtils";

const PRIORITY_LEVELS = [
  { key: "high", label: "High (8-10)" },
  { key: "medium", label: "Medium (4-7)" },
  { key: "low", label: "Low (0-3)" },
];

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
}) {
  return (
    <View
      style={[
        styles.filterSection,
        isFilterDropdownOpen && styles.filterSectionOpen,
      ]}
    >
      <View
        style={[
          styles.filterHeaderRow,
          !isSmallScreen && styles.filterHeaderRowWithSpacing,
        ]}
      >
        {isSmallScreen ? (
          <Pressable
            testID="filter-dropdown-toggle"
            style={[
              styles.filterDropdownToggle,
              isFilterDropdownOpen && styles.filterDropdownToggleOpen,
            ]}
            onPress={() => {
              closeOpenActionDrawer();
              setIsFilterDropdownOpen((prev) => {
                const nextOpen = !prev;
                if (nextOpen) {
                  setFilterDropdownOpenedAtMs(Date.now());
                }
                return nextOpen;
              });
            }}
          >
            <Text style={styles.filterLabel}>FILTER</Text>
            <Feather
              name={isFilterDropdownOpen ? "chevron-up" : "chevron-down"}
              size={12}
              style={styles.filterDropdownChevronIcon}
            />
          </Pressable>
        ) : null}
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
                  style={[styles.pill, isActive && styles.pillActive]}
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
            <Text
              style={styles.filterRowLabel}
            >{`TAGS (${countBillableGlobalTags(globalTags)}/${MAX_USER_TAGS})`}</Text>
            {globalTags.map((tag) => {
              const isActive = activeTag.toLowerCase() === tag.toLowerCase();
              const isDisabled = !tagUsageCounts.has(tag);
              return (
                <Pressable
                  key={tag}
                  testID={`tag-filter-${tag.toLowerCase()}`}
                  style={[
                    styles.pill,
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
                  <Text
                    style={[
                      styles.pillText,
                      isActive && styles.pillTextActive,
                      isDisabled && styles.pillTextDisabled,
                    ]}
                  >{`#${tag}`}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
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
