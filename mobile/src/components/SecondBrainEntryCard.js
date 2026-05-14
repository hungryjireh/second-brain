import { memo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

function getEntryBody(entry) {
  return entry.raw_text || entry.summary || '';
}

function getPriorityColor(priority, theme) {
  if (priority >= 8) return theme.colors.priorityHigh;
  if (priority >= 4) return theme.colors.note;
  return theme.colors.textSecondary;
}

const TAG_STYLES = {
  reminder: { bg: theme.colors.reminderTagBg, color: theme.colors.reminderTagText, label: 'Reminder' },
  todo: { bg: theme.colors.todoDim, color: theme.colors.todoTagText, label: 'TODO' },
  thought: { bg: theme.colors.thoughtDim, color: theme.colors.thoughtTagText, label: 'Thought' },
  note: { bg: theme.colors.noteDim, color: theme.colors.noteTagText, label: 'Note' },
};

const CATEGORY_ICONS = {
  reminder: '⏰',
  todo: '✅',
  thought: '💡',
  note: '📝',
};

function SecondBrainEntryCard({
  entry,
  styles,
  theme,
  isBusy,
  isSwipeOpen,
  isDeleteConfirm,
  onOpenEntry,
  onCloseSwipe,
  onStartEdit,
  onToggleArchive,
  onDownloadIcs,
  onRequestDelete,
  onActionDrawerChange,
  displayRemindAt,
  displayDate,
}) {
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
  const [drawerAnchor, setDrawerAnchor] = useState(null);
  const actionTriggerRef = useRef(null);
  const { width } = useWindowDimensions();
  const tag = TAG_STYLES[entry.category] ?? TAG_STYLES.note;
  const icon = CATEGORY_ICONS[entry.category] ?? '📝';
  const priority = Number.isInteger(entry.priority) ? entry.priority : 0;
  const archiveLabel = entry.category === 'reminder'
    ? (entry.is_archived ? 'Undo Done' : 'Mark Done')
    : (entry.is_archived ? 'Unarchive' : 'Archive');
  const isWeb = Platform.OS === 'web';
  const isSmallScreen = width < 720;

  function closeActionDrawer() {
    onActionDrawerChange?.(entry.id, false);
    setIsActionDrawerOpen(false);
  }

  function openActionDrawer() {
    const triggerNode = actionTriggerRef.current;
    if (triggerNode?.measureInWindow) {
      triggerNode.measureInWindow((x, y, w, h) => {
        setDrawerAnchor({ x, y, w, h });
        onActionDrawerChange?.(entry.id, true);
        setIsActionDrawerOpen(true);
      });
      return;
    }
    onActionDrawerChange?.(entry.id, true);
    setIsActionDrawerOpen(true);
  }

  const drawerLeft = drawerAnchor
    ? Math.max(8, Math.min(width - 8 - 132, drawerAnchor.x + drawerAnchor.w - 132))
    : 8;
  const drawerTop = drawerAnchor ? drawerAnchor.y + drawerAnchor.h + 6 : 0;

  return (
    <Pressable
      style={styles.card}
      onPress={() => {
        closeActionDrawer();
        if (!isWeb && isSwipeOpen) {
          onCloseSwipe();
          return;
        }
        onOpenEntry(entry);
      }}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cardMainCol}>
          {isSmallScreen ? (
            <View style={styles.cardMetaRowMobile}>
              <View style={styles.cardMetaLead}>
                <Text style={styles.cardIcon}>{icon}</Text>
                <Text style={[styles.priorityText, { color: getPriorityColor(priority, theme) }]}>P{priority}</Text>
                <Text style={styles.cardTitle}>{entry.title || 'Untitled'}</Text>
              </View>
              <View style={styles.mobileTitleActionRow}>
                <View style={[styles.tagPill, { backgroundColor: tag.bg }]}>
                  <Text style={[styles.tagPillText, { color: tag.color }]}>{tag.label}</Text>
                </View>
                <View style={styles.mobileActionDrawerWrap}>
                  <Pressable
                    ref={actionTriggerRef}
                    style={styles.mobileActionTrigger}
                    onPress={event => {
                      event?.stopPropagation?.();
                      if (isActionDrawerOpen) {
                        closeActionDrawer();
                        return;
                      }
                      openActionDrawer();
                    }}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <Text style={styles.mobileActionTriggerText}>...</Text>
                    ) : (
                      <Feather name="more-horizontal" size={16} style={styles.mobileActionTriggerIcon} />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardIcon}>{icon}</Text>
              <Text style={[styles.priorityText, { color: getPriorityColor(priority, theme) }]}>P{priority}</Text>
              <Text style={styles.cardTitle}>{entry.title || 'Untitled'}</Text>
            </View>
          )}
          <Text style={styles.cardBody}>{entry.summary || getEntryBody(entry)}</Text>
        </View>
        {!isSmallScreen ? (
          <View style={styles.cardActionCol}>
            <View style={styles.cardActionRow}>
              <Pressable
                style={styles.secondaryButton}
                onPress={event => {
                  event?.stopPropagation?.();
                  onStartEdit(entry);
                }}
                disabled={isBusy}
              >
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={event => {
                  event?.stopPropagation?.();
                  onToggleArchive(entry);
                }}
                disabled={isBusy}
              >
                <Text style={styles.secondaryButtonText}>{archiveLabel}</Text>
              </Pressable>
              {entry.category === 'reminder' && entry.remind_at ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={event => {
                    event?.stopPropagation?.();
                    onDownloadIcs(entry.id);
                  }}
                  disabled={isBusy}
                >
                  <Text style={styles.secondaryButtonText}>.ics</Text>
                </Pressable>
              ) : null}
              <View style={[styles.tagPill, { backgroundColor: tag.bg }]}>
                <Text style={[styles.tagPillText, { color: tag.color }]}>{tag.label}</Text>
              </View>
              {isWeb ? (
                <Pressable
                  style={[styles.deleteButton, isDeleteConfirm && styles.deleteButtonConfirm]}
                  onPress={event => {
                    event?.stopPropagation?.();
                    onRequestDelete(entry.id);
                  }}
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <Text style={[styles.deleteText, isDeleteConfirm && styles.deleteTextConfirm]}>...</Text>
                  ) : isDeleteConfirm ? (
                    <Text style={[styles.deleteText, styles.deleteTextConfirm]}>!</Text>
                  ) : (
                    <Feather name="x" size={14} style={styles.deleteIcon} />
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.metaInfoRow}>
        {entry.remind_at ? (
          <>
            <View style={styles.reminderMetaPill}>
              <Text style={styles.reminderMetaText}>⏰ {displayRemindAt || ''}</Text>
            </View>
            <Text style={styles.metaDot}>•</Text>
          </>
        ) : null}
        <Text style={styles.metaText}>{displayDate || ''}</Text>
      </View>

      {Array.isArray(entry.tags) && entry.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {entry.tags.map(tagName => (
            <View key={tagName} style={styles.itemTagPill}>
              <Text style={styles.itemTagText}>#{tagName}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {isSmallScreen ? (
        <Modal transparent visible={isActionDrawerOpen} animationType="none" onRequestClose={closeActionDrawer}>
          <Pressable style={styles.mobileActionDrawerBackdrop} onPress={closeActionDrawer}>
            <View style={[styles.mobileActionDrawer, styles.mobileActionDrawerPortal, { top: drawerTop, left: drawerLeft }]}>
              <Pressable
                style={styles.mobileActionDrawerItem}
                onPress={event => {
                  event?.stopPropagation?.();
                  closeActionDrawer();
                  onStartEdit(entry);
                }}
              >
                <Text style={styles.mobileActionDrawerText}>Edit</Text>
              </Pressable>
              <Pressable
                style={styles.mobileActionDrawerItem}
                onPress={event => {
                  event?.stopPropagation?.();
                  closeActionDrawer();
                  onToggleArchive(entry);
                }}
              >
                <Text style={styles.mobileActionDrawerText}>{archiveLabel}</Text>
              </Pressable>
              {isWeb ? (
                <Pressable
                  style={styles.mobileActionDrawerItem}
                  onPress={event => {
                    event?.stopPropagation?.();
                    closeActionDrawer();
                    onRequestDelete(entry.id);
                  }}
                >
                  <Text style={[styles.mobileActionDrawerText, styles.mobileActionDrawerDeleteText]}>
                    {isDeleteConfirm ? 'Confirm Delete' : 'Delete'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </Pressable>
  );
}

export default memo(SecondBrainEntryCard);
