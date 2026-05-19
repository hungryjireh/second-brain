import { FlatList, Text, View } from 'react-native';
import styles from './OpenBrainSectionedThoughtList.styles';

export default function OpenBrainSectionedThoughtList({
  data,
  keyExtractor,
  renderThoughtItem,
  listStyle,
  contentContainerStyle,
  listEmptyComponent,
}) {
  return (
    <FlatList
      data={data}
      style={listStyle}
      keyExtractor={keyExtractor}
      contentContainerStyle={contentContainerStyle}
      ListEmptyComponent={listEmptyComponent}
      renderItem={({ item }) => {
        if (item?.type === 'section') {
          return (
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>{item.title}</Text>
              <View style={styles.sectionHeaderLine} />
            </View>
          );
        }
        return renderThoughtItem({ item });
      }}
      initialNumToRender={8}
      maxToRenderPerBatch={6}
      updateCellsBatchingPeriod={50}
      windowSize={7}
      removeClippedSubviews
    />
  );
}
