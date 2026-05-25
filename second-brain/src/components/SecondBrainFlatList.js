import { memo, useCallback, useMemo, useState } from "react";
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

const ListSectionHeader = memo(
  function ListSectionHeader({ group, count, styles }) {
    return (
      <Text style={styles.sectionHeaderText}>{`${group} · ${count}`}</Text>
    );
  },
  (prevProps, nextProps) =>
    prevProps.group === nextProps.group &&
    prevProps.count === nextProps.count &&
    prevProps.styles === nextProps.styles,
);

const ListEntryRow = memo(
  function ListEntryRow({
    entry,
    styles,
    displayDate,
    displayRemindAt,
    isBusy,
    isWeb,
    isSwipeOpen,
    isActionDrawerActive,
    closeSwipe,
    openEntry,
    startEdit,
    toggleArchiveWithConfirmation,
    downloadIcs,
    requestDelete,
    handleActionDrawerChange,
    closeAnyActionDrawer,
    setOpenSwipeId,
    swipeActionWidth,
    onSwipeGestureStart,
    onSwipeGestureEnd,
  }) {
    const handleDelete = useCallback(() => {
      requestDelete(entry.id);
    }, [entry.id, requestDelete]);

    const cardContent = (
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        isBusy={isBusy}
        isSwipeOpen={isSwipeOpen}
        isDeleteConfirm={false}
        displayDate={displayDate}
        displayRemindAt={displayRemindAt}
        onOpenEntry={openEntry}
        onCloseSwipe={closeSwipe}
        onStartEdit={startEdit}
        onToggleArchive={toggleArchiveWithConfirmation}
        onDownloadIcs={downloadIcs}
        onRequestDelete={requestDelete}
        onActionDrawerChange={handleActionDrawerChange}
        isActionDrawerActive={isActionDrawerActive}
        onCloseAnyActionDrawer={closeAnyActionDrawer}
      />
    );
    if (isWeb) return <View style={styles.webEntryRow}>{cardContent}</View>;

    return (
      <SwipeToDeleteRow
        id={entry.id}
        isOpen={isSwipeOpen}
        isRaised={isActionDrawerActive}
        onOpen={setOpenSwipeId}
        actionLabel={isBusy ? "..." : "Delete"}
        onActionPress={handleDelete}
        actionWidth={swipeActionWidth}
        onSwipeGestureStart={onSwipeGestureStart}
        onSwipeGestureEnd={onSwipeGestureEnd}
        styles={styles}
      >
        {cardContent}
      </SwipeToDeleteRow>
    );
  },
  (prevProps, nextProps) =>
    prevProps.entry === nextProps.entry &&
    prevProps.styles === nextProps.styles &&
    prevProps.displayDate === nextProps.displayDate &&
    prevProps.displayRemindAt === nextProps.displayRemindAt &&
    prevProps.isBusy === nextProps.isBusy &&
    prevProps.isWeb === nextProps.isWeb &&
    prevProps.isSwipeOpen === nextProps.isSwipeOpen &&
    prevProps.isActionDrawerActive === nextProps.isActionDrawerActive &&
    prevProps.closeSwipe === nextProps.closeSwipe &&
    prevProps.openEntry === nextProps.openEntry &&
    prevProps.startEdit === nextProps.startEdit &&
    prevProps.toggleArchiveWithConfirmation ===
      nextProps.toggleArchiveWithConfirmation &&
    prevProps.downloadIcs === nextProps.downloadIcs &&
    prevProps.requestDelete === nextProps.requestDelete &&
    prevProps.handleActionDrawerChange === nextProps.handleActionDrawerChange &&
    prevProps.closeAnyActionDrawer === nextProps.closeAnyActionDrawer &&
    prevProps.setOpenSwipeId === nextProps.setOpenSwipeId &&
    prevProps.swipeActionWidth === nextProps.swipeActionWidth &&
    prevProps.onSwipeGestureStart === nextProps.onSwipeGestureStart &&
    prevProps.onSwipeGestureEnd === nextProps.onSwipeGestureEnd,
);

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
  const isWeb = Platform.OS === "web";
  const [isSwipeInteracting, setIsSwipeInteracting] = useState(false);

  const closeSwipe = useCallback(() => {
    setOpenSwipeId(null);
  }, [setOpenSwipeId]);
  const handleSwipeGestureStart = useCallback(() => {
    setIsSwipeInteracting(true);
  }, []);
  const handleSwipeGestureEnd = useCallback(() => {
    setIsSwipeInteracting(false);
  }, []);

  const renderListItem = useCallback(
    ({ item }) => {
      if (item.type === "header") {
        return (
          <ListSectionHeader
            group={item.group}
            count={item.count}
            styles={styles}
          />
        );
      }

      const entry = item.entry;
      if (!entry) return null;
      return (
        <ListEntryRow
          entry={entry}
          styles={styles}
          displayDate={item.displayDate}
          displayRemindAt={item.displayRemindAt}
          isBusy={busyId === entry.id}
          isWeb={isWeb}
          isSwipeOpen={openSwipeId === entry.id}
          isActionDrawerActive={openActionDrawerId === entry.id}
          closeSwipe={closeSwipe}
          openEntry={openEntry}
          startEdit={startEdit}
          toggleArchiveWithConfirmation={toggleArchiveWithConfirmation}
          downloadIcs={downloadIcs}
          requestDelete={requestDelete}
          handleActionDrawerChange={handleActionDrawerChange}
          closeAnyActionDrawer={closeAnyActionDrawer}
          setOpenSwipeId={setOpenSwipeId}
          swipeActionWidth={swipeActionWidth}
          onSwipeGestureStart={handleSwipeGestureStart}
          onSwipeGestureEnd={handleSwipeGestureEnd}
        />
      );
    },
    [
      busyId,
      closeAnyActionDrawer,
      closeSwipe,
      downloadIcs,
      handleActionDrawerChange,
      isWeb,
      openActionDrawerId,
      openEntry,
      openSwipeId,
      requestDelete,
      setOpenSwipeId,
      handleSwipeGestureStart,
      handleSwipeGestureEnd,
      startEdit,
      styles,
      swipeActionWidth,
      toggleArchiveWithConfirmation,
    ],
  );

  const listContentContainerStyle = useMemo(
    () => [
      styles.listContent,
      groupedRows.length === 0 && (loadingEntries || hasActiveFilters)
        ? styles.listContentEmpty
        : null,
      pullRefreshing ? { paddingTop: 100 } : null,
      { paddingBottom: listBottomPadding },
    ],
    [
      groupedRows.length,
      hasActiveFilters,
      listBottomPadding,
      loadingEntries,
      pullRefreshing,
      styles.listContent,
      styles.listContentEmpty,
    ],
  );

  const listEmptyComponent = useMemo(() => {
    if (loadingEntries) {
      return (
        <View style={styles.listEmptyCentered}>
          <Text style={styles.listEmptyText}>Loading thoughts...</Text>
        </View>
      );
    }
    if (hasActiveFilters) {
      return (
        <View style={styles.listEmptyCentered}>
          <Text style={styles.listEmptyText}>No matching entries</Text>
        </View>
      );
    }
    return null;
  }, [
    hasActiveFilters,
    loadingEntries,
    styles.listEmptyCentered,
    styles.listEmptyText,
  ]);

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
      <View
        style={{
          flex: 1,
          transform: [{ translateY: pullRefreshing ? -40 : 0 }],
        }}
      >
        <FlatList
          testID="second-brain-flat-list"
          data={groupedRows}
          style={styles.list}
          contentContainerStyle={listContentContainerStyle}
          keyExtractor={keyExtractor}
          CellRendererComponent={renderCell}
          renderItem={renderListItem}
          ListEmptyComponent={listEmptyComponent}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={9}
          removeClippedSubviews={!isWeb}
          onScrollBeginDrag={closeOpenActionDrawer}
          onRefresh={onRefresh}
          refreshing={pullRefreshing}
          scrollEnabled={!pullRefreshing && !isSwipeInteracting}
        />
      </View>
    </View>
  );
}
