import { useCallback } from "react";
import { FlatList, Platform, Text, View } from "react-native";
import { theme } from "../theme";
import SecondBrainEntryCard from "./SecondBrainEntryCard";
import SwipeToDeleteRow from "./SwipeToDeleteRow";

export default function SecondBrainFlatList({
  groupedRows,
  openActionDrawerId,
  styles,
  loadingEntries,
  listBottomPadding,
  keyExtractor,
  renderCell,
  hasActiveFilters,
  closeOpenActionDrawer,
  busyId,
  openSwipeId,
  setOpenSwipeId,
  requestDelete,
  openEntry,
  startEdit,
  toggleArchiveWithConfirmation,
  downloadIcs,
  handleActionDrawerChange,
  swipeActionWidth,
  closeAnyActionDrawer,
}) {
  const closeSwipe = useCallback(() => {
    setOpenSwipeId(null);
  }, [setOpenSwipeId]);

  const renderListItem = useCallback(
    ({ item }) => {
      if (item.type === "header") {
        return (
          <Text
            style={styles.sectionHeaderText}
          >{`${item.group} · ${item.count}`}</Text>
        );
      }

      const entry = item.entry;
      if (!entry) return null;
      const isBusy = busyId === entry.id;
      const isWeb = Platform.OS === "web";
      const cardContent = (
        <SecondBrainEntryCard
          entry={entry}
          styles={styles}
          theme={theme}
          isBusy={isBusy}
          isSwipeOpen={openSwipeId === entry.id}
          isDeleteConfirm={false}
          displayDate={item.displayDate}
          displayRemindAt={item.displayRemindAt}
          onOpenEntry={openEntry}
          onCloseSwipe={closeSwipe}
          onStartEdit={startEdit}
          onToggleArchive={toggleArchiveWithConfirmation}
          onDownloadIcs={downloadIcs}
          onRequestDelete={requestDelete}
          onActionDrawerChange={handleActionDrawerChange}
          isActionDrawerActive={openActionDrawerId === entry.id}
          hasOpenActionDrawer={openActionDrawerId !== null}
          onCloseAnyActionDrawer={closeAnyActionDrawer}
        />
      );
      if (isWeb) return <View style={styles.webEntryRow}>{cardContent}</View>;

      return (
        <SwipeToDeleteRow
          id={entry.id}
          isOpen={openSwipeId === entry.id}
          isRaised={openActionDrawerId === entry.id}
          onOpen={setOpenSwipeId}
          actionLabel={isBusy ? "..." : "Delete"}
          onActionPress={() => requestDelete(entry.id)}
          actionWidth={swipeActionWidth}
          styles={styles}
        >
          {cardContent}
        </SwipeToDeleteRow>
      );
    },
    [
      busyId,
      closeAnyActionDrawer,
      closeSwipe,
      closeOpenActionDrawer,
      downloadIcs,
      handleActionDrawerChange,
      openActionDrawerId,
      openEntry,
      openSwipeId,
      requestDelete,
      setOpenSwipeId,
      startEdit,
      styles,
      swipeActionWidth,
      toggleArchiveWithConfirmation,
    ],
  );

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
