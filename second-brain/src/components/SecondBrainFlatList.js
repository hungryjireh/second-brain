import { FlatList, Text, View } from "react-native";

export default function SecondBrainFlatList({
  groupedRows,
  openActionDrawerId,
  styles,
  loadingEntries,
  listBottomPadding,
  keyExtractor,
  renderCell,
  renderListItem,
  hasActiveFilters,
  closeOpenActionDrawer,
}) {
  return (
    <FlatList
      data={groupedRows}
      extraData={openActionDrawerId}
      style={styles.list}
      contentContainerStyle={[
        styles.listContent,
        loadingEntries && groupedRows.length === 0 && styles.listContentEmpty,
        { paddingBottom: listBottomPadding },
      ]}
      keyExtractor={keyExtractor}
      CellRendererComponent={renderCell}
      renderItem={renderListItem}
      ListEmptyComponent={
        loadingEntries ? (
          <View style={styles.listEmptyCentered}>
            <Text style={styles.listEmptyText}>Loading thoughts...</Text>
          </View>
        ) : hasActiveFilters ? (
          <Text style={styles.listEmptyText}>No matching entries</Text>
        ) : null
      }
      initialNumToRender={10}
      maxToRenderPerBatch={8}
      updateCellsBatchingPeriod={50}
      windowSize={9}
      removeClippedSubviews={false}
      onScrollBeginDrag={closeOpenActionDrawer}
    />
  );
}
