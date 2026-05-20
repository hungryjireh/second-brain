import { Pressable, Text, View } from "react-native";
import { theme } from "../theme";

const STATS = [
  {
    key: "reminder",
    label: "Reminders",
    color: theme.colors.brand,
  },
  {
    key: "todo",
    label: "TODOs",
    color: theme.colors.todo,
  },
  {
    key: "thought",
    label: "Thoughts",
    color: theme.colors.thought,
  },
  {
    key: "note",
    label: "Notes",
    color: theme.colors.note,
  },
];

export default function SecondBrainStatsGrid({
  styles,
  isSmallScreen,
  activeCategory,
  counts,
  closeOpenActionDrawer,
  setActiveCategory,
}) {
  return (
    <View
      testID="stats-grid"
      style={[styles.statsGrid, isSmallScreen && styles.statsGridSmall]}
    >
      {STATS.map((stat) => {
        const isActive = activeCategory === stat.key;
        return (
          <Pressable
            key={stat.key}
            testID={`stat-card-${stat.key}`}
            style={[
              styles.statCard,
              isSmallScreen && styles.statCardSmall,
              isActive && styles.statCardActive,
            ]}
            onPress={() => {
              closeOpenActionDrawer();
              setActiveCategory((prev) => (prev === stat.key ? "" : stat.key));
            }}
          >
            <View
              style={[
                styles.statGlow,
                { backgroundColor: theme.colors.bgBase },
              ]}
            />
            <Text
              style={[
                styles.statCount,
                { color: isActive ? theme.colors.brandText : stat.color },
              ]}
            >
              {counts[stat.key] ?? 0}
            </Text>
            <Text
              style={[
                styles.statLabel,
                isSmallScreen && styles.statLabelSmall,
                isActive && styles.statLabelActive,
              ]}
              numberOfLines={1}
            >
              {stat.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
