import { memo, useCallback } from "react";
import { FlatList, Text, View } from "react-native";
import styles from "./OpenBrainSectionedThoughtList.styles";

const SectionHeaderRow = memo(function SectionHeaderRow({ title }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.sectionHeaderLine} />
    </View>
  );
});

function OpenBrainSectionedThoughtList({
  data,
  keyExtractor,
  renderThoughtItem,
  listStyle,
  contentContainerStyle,
  listEmptyComponent,
  listFooterComponent,
  onEndReached,
  onEndReachedThreshold = 0.4,
}) {
  const renderListItem = useCallback(
    ({ item }) => {
      if (item?.type === "section") {
        return <SectionHeaderRow title={item.title} />;
      }
      return renderThoughtItem({ item });
    },
    [renderThoughtItem],
  );

  return (
    <FlatList
      data={data}
      style={listStyle}
      keyExtractor={keyExtractor}
      contentContainerStyle={contentContainerStyle}
      ListEmptyComponent={listEmptyComponent}
      ListFooterComponent={listFooterComponent}
      renderItem={renderListItem}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      initialNumToRender={8}
      maxToRenderPerBatch={6}
      updateCellsBatchingPeriod={50}
      windowSize={7}
      removeClippedSubviews
    />
  );
}

export default memo(OpenBrainSectionedThoughtList);
