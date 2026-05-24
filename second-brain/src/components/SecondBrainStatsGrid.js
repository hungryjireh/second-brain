import { Pressable, Text, View } from "react-native";
import { theme } from "../theme";

const STATS = [
  {
    key: "reminder",
    label: "Reminders",
    color: theme.colors.brand,
    symbol: "◎",
    cardBackgroundColor: "#DDEEE5",
    borderColor: "#58D0A0",
    labelColor: "#8B9AB2",
  },
  {
    key: "todo",
    label: "TODOs",
    color: theme.colors.todo,
    symbol: "◻",
    cardBackgroundColor: "#DCE7F6",
    borderColor: "#7FB1F2",
    labelColor: "#8494AE",
  },
  {
    key: "thought",
    label: "Thoughts",
    color: theme.colors.thought,
    symbol: "◈",
    cardBackgroundColor: "#E7E4F4",
    borderColor: "#B1A2EE",
    labelColor: "#8494AE",
  },
  {
    key: "note",
    label: "Notes",
    color: theme.colors.note,
    symbol: "◇",
    cardBackgroundColor: "#F1ECD9",
    borderColor: "#E6BA35",
    labelColor: "#8494AE",
  },
];

function getStatCountTextStyle(styles, value) {
  const digitCount = String(Math.abs(Number(value) || 0)).length;
  if (digitCount >= 4) return styles.statCount4Digits;
  if (digitCount >= 3) return styles.statCount3Digits;
  return null;
}

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
        const count = counts[stat.key] ?? 0;
        return (
          <Pressable
            key={stat.key}
            testID={`stat-card-${stat.key}`}
            style={({ pressed }) => [
              styles.statCard,
              isSmallScreen && styles.statCardSmall,
              {
                borderColor: stat.borderColor,
                backgroundColor:
                  pressed || isActive ? stat.color : stat.cardBackgroundColor,
              },
              isActive && styles.statCardActive,
            ]}
            onPress={() => {
              closeOpenActionDrawer();
              setActiveCategory((prev) => (prev === stat.key ? "" : stat.key));
            }}
          >
            {({ pressed }) => {
              const activeTextColor =
                pressed || isActive ? theme.colors.textLight : null;
              return (
                <>
                  <Text
                    style={[
                      styles.statSymbol,
                      { color: activeTextColor ?? stat.color },
                    ]}
                  >
                    {stat.symbol}
                  </Text>
                  <Text
                    style={[
                      styles.statCount,
                      getStatCountTextStyle(styles, count),
                      { color: activeTextColor ?? stat.color },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {count}
                  </Text>
                  <Text
                    style={[
                      styles.statLabel,
                      { color: activeTextColor ?? stat.labelColor },
                      isSmallScreen && styles.statLabelSmall,
                      isActive && styles.statLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {stat.label}
                  </Text>
                </>
              );
            }}
          </Pressable>
        );
      })}
    </View>
  );
}
