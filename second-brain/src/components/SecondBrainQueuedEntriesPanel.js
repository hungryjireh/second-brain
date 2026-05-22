import { memo, useCallback, useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import SwipeToDeleteRow from "./SwipeToDeleteRow";
import SecondBrainEntryCard from "./SecondBrainEntryCard";
import { theme } from "../theme";

function labelForType(type) {
  if (type === "create") return "Queued Create";
  if (type === "archive") return "Queued Archive";
  if (type === "delete") return "Queued Delete";
  return "Queued Change";
}

const QueuedEntryRow = memo(function QueuedEntryRow({
  item,
  index,
  styles,
  isEditing,
  isSaving,
  validationError,
  draftDescription,
  openSwipeId,
  setOpenSwipeId,
  setDraftDescription,
  setValidationError,
  onCancelEdit,
  onStartEdit,
  onSaveEdit,
  onDeleteQueuedEntry,
}) {
  const usesEntryCard = item.editable || item.type === "delete";
  const queuedCardEntry = useMemo(
    () => ({
      id: item.queueId,
      title:
        item.type === "delete"
          ? item.summary
          : (item.description || "")
              .split("\n")
              .map((line) => line.trim())
              .find(Boolean) || "Queued entry",
      summary:
        item.type === "delete"
          ? "This entry will be deleted when sync completes."
          : item.summary || "",
      raw_text:
        item.type === "delete"
          ? "This entry will be deleted when sync completes."
          : item.summary || "",
      category: "note",
      priority: 0,
      is_archived: false,
      tags: [],
    }),
    [item],
  );

  const handleDelete = useCallback(async () => {
    const result = await onDeleteQueuedEntry(item.queueId);
    if (!result?.ok) {
      setValidationError(
        result?.error?.message || "Unable to delete queued entry.",
      );
    }
    setOpenSwipeId("");
  }, [item.queueId, onDeleteQueuedEntry, setOpenSwipeId, setValidationError]);

  const handleSave = useCallback(async () => {
    const nextDescription = draftDescription.trim();
    if (!nextDescription) {
      setValidationError("Description is required.");
      return;
    }
    const result = await onSaveEdit(item.queueId, nextDescription);
    if (!result?.ok) {
      setValidationError(
        result?.error?.message || "Unable to save queued entry.",
      );
      return;
    }
    onCancelEdit();
  }, [
    draftDescription,
    item.queueId,
    onCancelEdit,
    onSaveEdit,
    setValidationError,
  ]);

  const rowContent = (
    <View
      style={
        usesEntryCard ? styles.queuedEntryCardCompact : styles.queuedEntryCard
      }
    >
      {usesEntryCard ? (
        <SecondBrainEntryCard
          entry={queuedCardEntry}
          styles={styles}
          theme={theme}
          isBusy={isSaving}
          isSwipeOpen={false}
          isDeleteConfirm={false}
          onOpenEntry={() => {}}
          onCloseSwipe={() => {}}
          onStartEdit={
            item.editable
              ? () => {
                  onStartEdit(
                    item.queueId,
                    item.description || item.summary || "",
                  );
                }
              : () => {}
          }
          onToggleArchive={() => {}}
          onDownloadIcs={() => {}}
          onRequestDelete={() => {}}
          onActionDrawerChange={() => {}}
          isActionDrawerActive={false}
          hasOpenActionDrawer={false}
          onCloseAnyActionDrawer={() => {}}
          displayDate={labelForType(item.type)}
          displayRemindAt=""
          hidePriority
          hideMenuButton
        />
      ) : (
        <Text style={styles.queuedEntryType}>{labelForType(item.type)}</Text>
      )}
      {isEditing ? (
        <>
          <TextInput
            value={draftDescription}
            onChangeText={(nextValue) => {
              setDraftDescription(nextValue);
              if (validationError) setValidationError("");
            }}
            style={styles.queuedEntryInput}
            placeholder="Edit queued entry"
            multiline
            testID={`queued-edit-input-${item.queueId}`}
          />
          {validationError ? (
            <Text style={styles.queuedEntryError}>{validationError}</Text>
          ) : null}
          <View style={styles.queuedEntryActionsRow}>
            <Pressable
              style={styles.queuedEntryButton}
              onPress={onCancelEdit}
              disabled={isSaving}
            >
              <Text style={styles.queuedEntryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.queuedEntryButton}
              onPress={handleSave}
              disabled={isSaving}
              testID={`queued-save-button-${item.queueId}`}
            >
              <Text style={styles.queuedEntryButtonText}>
                {isSaving ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>
        </>
      ) : usesEntryCard ? null : (
        <>
          <Text style={styles.queuedEntrySummary}>{item.summary}</Text>
          <Text
            style={styles.queuedEntryMeta}
          >{`Queue item ${index + 1}`}</Text>
        </>
      )}
    </View>
  );

  if (Platform.OS === "web") {
    return <View>{rowContent}</View>;
  }

  return (
    <SwipeToDeleteRow
      id={item.queueId}
      isOpen={openSwipeId === item.queueId}
      isRaised={false}
      onOpen={(id) => setOpenSwipeId(id)}
      actionLabel={isSaving ? "..." : "Delete"}
      onActionPress={handleDelete}
      actionWidth={92}
      styles={styles}
    >
      {rowContent}
    </SwipeToDeleteRow>
  );
});

export default function SecondBrainQueuedEntriesPanel({
  styles,
  queuedEntries,
  savingQueueEntryId,
  queueError,
  onSaveQueuedEntry,
  onDeleteQueuedEntry,
}) {
  const [editingQueueId, setEditingQueueId] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [validationError, setValidationError] = useState("");
  const [openSwipeId, setOpenSwipeId] = useState("");
  const handleStartEdit = useCallback((queueId, description) => {
    setEditingQueueId(queueId);
    setDraftDescription(description);
    setValidationError("");
  }, []);
  const handleCancelEdit = useCallback(() => {
    setEditingQueueId("");
    setDraftDescription("");
    setValidationError("");
  }, []);
  const handleSaveEdit = useCallback(
    (queueId, description) => onSaveQueuedEntry({ queueId, description }),
    [onSaveQueuedEntry],
  );

  if (!Array.isArray(queuedEntries) || queuedEntries.length === 0) return null;

  return (
    <View style={styles.queuedEntriesList}>
      {queuedEntries.map((item, index) => {
        return (
          <QueuedEntryRow
            key={item.queueId}
            item={item}
            index={index}
            styles={styles}
            isEditing={editingQueueId === item.queueId}
            isSaving={savingQueueEntryId === item.queueId}
            validationError={
              editingQueueId === item.queueId ? validationError : ""
            }
            draftDescription={
              editingQueueId === item.queueId ? draftDescription : ""
            }
            openSwipeId={openSwipeId}
            setOpenSwipeId={setOpenSwipeId}
            setDraftDescription={setDraftDescription}
            setValidationError={setValidationError}
            onCancelEdit={handleCancelEdit}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onDeleteQueuedEntry={onDeleteQueuedEntry}
          />
        );
      })}
      {queueError ? (
        <Text style={styles.queuedEntryError}>{queueError}</Text>
      ) : null}
    </View>
  );
}
