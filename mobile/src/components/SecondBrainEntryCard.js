import { Platform, Pressable, Text, View } from 'react-native';

function getEntryBody(entry) {
  return entry.raw_text || entry.summary || '';
}

function getPriorityColor(priority, theme) {
  if (priority >= 8) return '#ef4444';
  if (priority >= 4) return '#f59e0b';
  return theme.colors.textSecondary;
}

const TAG_STYLES = {
  reminder: { bg: 'rgba(29,158,117,0.15)', color: '#2ecf9a', label: 'Reminder' },
  todo: { bg: 'rgba(55,138,221,0.15)', color: '#6ab4f5', label: 'TODO' },
  thought: { bg: 'rgba(127,119,221,0.15)', color: '#a8a3f0', label: 'Thought' },
  note: { bg: 'rgba(239,159,39,0.15)', color: '#f5bf6a', label: 'Note' },
};

const CATEGORY_ICONS = {
  reminder: '⏰',
  todo: '✅',
  thought: '💡',
  note: '📝',
};

export default function SecondBrainEntryCard({
  entry,
  styles,
  theme,
  timezone,
  isBusy,
  isSwipeOpen,
  isDeleteConfirm,
  onOpenEntry,
  onCloseSwipe,
  onStartEdit,
  onToggleArchive,
  onDownloadIcs,
  onRequestDelete,
  formatRemindAt,
  formatDate,
}) {
  const tag = TAG_STYLES[entry.category] ?? TAG_STYLES.note;
  const icon = CATEGORY_ICONS[entry.category] ?? '📝';
  const priority = Number.isInteger(entry.priority) ? entry.priority : 0;
  const archiveLabel = entry.category === 'reminder'
    ? (entry.is_archived ? 'Undo Done' : 'Mark Done')
    : (entry.is_archived ? 'Unarchive' : 'Archive');
  const isWeb = Platform.OS === 'web';

  return (
    <Pressable
      style={styles.card}
      onPress={() => {
        if (!isWeb && isSwipeOpen) {
          onCloseSwipe();
          return;
        }
        onOpenEntry(entry);
      }}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cardMainCol}>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardIcon}>{icon}</Text>
            <Text style={[styles.priorityText, { color: getPriorityColor(priority, theme) }]}>P{priority}</Text>
            <Text style={styles.cardTitle}>{entry.title || 'Untitled'}</Text>
          </View>
          <Text style={styles.cardBody}>{entry.summary || getEntryBody(entry)}</Text>
        </View>
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
                <Text style={[styles.deleteText, isDeleteConfirm && styles.deleteTextConfirm]}>
                  {isBusy ? '...' : (isDeleteConfirm ? '!' : '×')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.metaInfoRow}>
        {entry.remind_at ? (
          <>
            <View style={styles.reminderMetaPill}>
              <Text style={styles.reminderMetaText}>⏰ {formatRemindAt(entry.remind_at, timezone)}</Text>
            </View>
            <Text style={styles.metaDot}>•</Text>
          </>
        ) : null}
        <Text style={styles.metaText}>{formatDate(entry.created_at, timezone) || ''}</Text>
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
    </Pressable>
  );
}
