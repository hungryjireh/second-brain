import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Text,
  View,
} from "react-native";
import { theme } from "../theme";
import SecondBrainEntryCard from "./SecondBrainEntryCard";
import SwipeToDeleteRow from "./SwipeToDeleteRow";

export default function SecondBrainFlatList({
  groupedRows,
  openActionDrawerId,
  styles,
  loadingEntries,
  onRefresh,
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
  pullRefreshing = false,
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
    <View style={{ flex: 1 }}>
      {pullRefreshing ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={theme.colors.textSecondary} />
        </View>
      ) : null}
      <View style={{ flex: 1, transform: [{ translateY: pullRefreshing ? -40 : 0 }] }}>
        <FlatList
          testID="second-brain-flat-list"
          data={groupedRows}
          extraData={openActionDrawerId}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            loadingEntries && groupedRows.length === 0 && styles.listContentEmpty,
            pullRefreshing ? { paddingTop: 100 } : null,
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
          onRefresh={onRefresh}
          refreshing={loadingEntries && !pullRefreshing}
          scrollEnabled={!pullRefreshing}
        />
      </View>
    </View>
  );
}
