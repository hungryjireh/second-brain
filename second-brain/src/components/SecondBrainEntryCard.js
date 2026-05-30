import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../theme";

function getEntryBody(entry) {
  return entry.raw_text || entry.summary || "";
}

function getPriorityColor(priority, theme) {
  if (priority >= 8) return theme.colors.priorityHigh;
  if (priority >= 4) return theme.colors.note;
  return theme.colors.textSecondary;
}

const TAG_STYLES = {
  reminder: {
    bg: theme.colors.reminderTagBg,
    color: theme.colors.reminderTagText,
    label: "Reminder",
  },
  todo: {
    bg: theme.colors.todoDim,
    color: theme.colors.todoTagText,
    label: "TODO",
  },
  thought: {
    bg: theme.colors.thoughtDim,
    color: theme.colors.thoughtTagText,
    label: "Thought",
  },
  note: {
    bg: theme.colors.noteDim,
    color: theme.colors.noteTagText,
    label: "Note",
  },
};

const CATEGORY_ICONS = {
  reminder: "clock",
  todo: "check-square",
  thought: "zap",
  note: "edit-3",
};

const TAG_PILL_GAP = 6;

const TwoLineClampText = memo(function TwoLineClampText({
  text,
  style,
  testID,
}) {
  return (
    <Text testID={testID} style={style} numberOfLines={2} ellipsizeMode="tail">
      {String(text || "").trim()}
    </Text>
  );
});

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
  isActionDrawerActive,
  hasOpenActionDrawer = false,
  onCloseAnyActionDrawer,
  displayRemindAt,
  displayDate,
  isSmallScreenOverride,
  hidePriority,
  hideMenuButton,
}) {
  const actionTriggerRef = useRef(null);
  const ignoreCardPressUntilRef = useRef(0);
  const inlineActionsAnim = useRef(new Animated.Value(0)).current;
  const [isInlineActionsMounted, setIsInlineActionsMounted] = useState(false);
  const [tagsRowWidth, setTagsRowWidth] = useState(0);
  const [tagWidths, setTagWidths] = useState([]);
  const { width } = useWindowDimensions();
  const tag = TAG_STYLES[entry.category] ?? TAG_STYLES.note;
  const icon = CATEGORY_ICONS[entry.category] ?? "edit-3";
  const priority = Number.isInteger(entry.priority) ? entry.priority : 0;
  const archiveLabel =
    entry.category === "reminder"
      ? entry.is_archived
        ? "Undo Done"
        : "Mark Done"
      : entry.is_archived
        ? "Unarchive"
        : "Archive";
  const isWeb = Platform.OS === "web";
  const isSmallScreen =
    typeof isSmallScreenOverride === "boolean"
      ? isSmallScreenOverride
      : width < 720;
  const showInlineActions = isSmallScreen && isInlineActionsMounted;

  useEffect(() => {
    if (!isSmallScreen) return;
    if (isActionDrawerActive) {
      setIsInlineActionsMounted(true);
      inlineActionsAnim.setValue(0);
      Animated.timing(inlineActionsAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!isInlineActionsMounted) return;
    Animated.timing(inlineActionsAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsInlineActionsMounted(false);
    });
  }, [
    inlineActionsAnim,
    isActionDrawerActive,
    isInlineActionsMounted,
    isSmallScreen,
  ]);
  const entryTags = Array.isArray(entry.tags) ? entry.tags : [];

  useEffect(() => {
    setTagWidths([]);
    setTagsRowWidth(0);
  }, [entryTags.join("|")]);

  const hasMeasuredAllTags = useMemo(
    () =>
      entryTags.length > 0 &&
      entryTags.every((_, index) => Number.isFinite(tagWidths[index])),
    [entryTags, tagWidths],
  );

  const visibleTagCount = useMemo(() => {
    if (!hasMeasuredAllTags || tagsRowWidth <= 0) {
      return entryTags.length;
    }
    let consumedWidth = 0;
    let fitCount = 0;
    for (let index = 0; index < entryTags.length; index += 1) {
      const tagWidth = tagWidths[index];
      const nextWidth =
        consumedWidth + (fitCount > 0 ? TAG_PILL_GAP : 0) + tagWidth;
      if (nextWidth > tagsRowWidth) break;
      consumedWidth = nextWidth;
      fitCount += 1;
    }
    return fitCount;
  }, [entryTags.length, hasMeasuredAllTags, tagWidths, tagsRowWidth]);

  const visibleTags = hasMeasuredAllTags
    ? entryTags.slice(0, visibleTagCount)
    : entryTags;

  function closeActionDrawer(onClosed) {
    onActionDrawerChange?.(entry.id, false);
    onClosed?.();
  }

  function openActionDrawer() {
    onActionDrawerChange?.(entry.id, true);
  }

  function markIgnoreCardPress() {
    ignoreCardPressUntilRef.current = Date.now() + 300;
  }

  return (
    <Pressable
      testID={`entry-card-${entry.id}`}
      style={[
        styles.card,
        {
          borderLeftWidth: 4,
          borderLeftColor: tag.color,
        },
      ]}
      onPress={() => {
        if (Date.now() < ignoreCardPressUntilRef.current) {
          return;
        }
        if (!isActionDrawerActive) {
          if (hasOpenActionDrawer) {
            onCloseAnyActionDrawer?.();
            return;
          }
          const closeResult = onCloseAnyActionDrawer?.();
          if (closeResult === true) {
            return;
          }
        }
        if (showInlineActions) {
          closeActionDrawer();
          return;
        }
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
            showInlineActions ? (
              <Animated.View
                style={[
                  styles.mobileInlineActionsRow,
                  {
                    opacity: inlineActionsAnim,
                    transform: [
                      {
                        translateX: inlineActionsAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [16, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Pressable
                  style={styles.secondaryButton}
                  onPress={(event) => {
                    event?.stopPropagation?.();
                    closeActionDrawer(() => {
                      onStartEdit(entry);
                    });
                  }}
                  disabled={isBusy}
                >
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={(event) => {
                    event?.stopPropagation?.();
                    closeActionDrawer(() => {
                      onToggleArchive(entry);
                    });
                  }}
                  disabled={isBusy}
                >
                  <Text style={styles.secondaryButtonText}>{archiveLabel}</Text>
                </Pressable>
                {entry.category === "reminder" && entry.remind_at ? (
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={(event) => {
                      event?.stopPropagation?.();
                      closeActionDrawer(() => {
                        onDownloadIcs(entry.id);
                      });
                    }}
                    disabled={isBusy}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Add to Calendar
                    </Text>
                  </Pressable>
                ) : null}
              </Animated.View>
            ) : (
              <View style={styles.cardMetaRowMobile}>
                <View style={styles.cardMetaLead}>
                  <View style={[styles.tagPill, { backgroundColor: tag.bg }]}>
                    <Text style={[styles.tagPillText, { color: tag.color }]}>
                      {tag.label}
                    </Text>
                  </View>
                  {hidePriority ? null : (
                    <Text
                      style={[
                        styles.priorityText,
                        { color: getPriorityColor(priority, theme) },
                      ]}
                    >
                      P{priority}
                    </Text>
                  )}
                </View>
                <View style={styles.mobileTitleActionRow}>
                  {hideMenuButton ? null : (
                    <View style={styles.mobileActionDrawerWrap}>
                      <Pressable
                        ref={actionTriggerRef}
                        testID={`entry-action-trigger-${entry.id}`}
                        style={styles.mobileActionTrigger}
                        onPressIn={(event) => {
                          markIgnoreCardPress();
                          event?.stopPropagation?.();
                        }}
                        onPress={(event) => {
                          markIgnoreCardPress();
                          event?.stopPropagation?.();
                          if (isActionDrawerActive) {
                            closeActionDrawer();
                            return;
                          }
                          openActionDrawer();
                        }}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <Text style={styles.mobileActionTriggerText}>
                            ...
                          </Text>
                        ) : (
                          <Feather
                            name="more-horizontal"
                            size={16}
                            style={styles.mobileActionTriggerIcon}
                          />
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            )
          ) : (
            <View style={styles.cardMetaRow}>
              <Feather
                name={icon}
                size={14}
                style={styles.cardIcon}
                color={theme.colors.brand}
              />
              {hidePriority ? null : (
                <Text
                  style={[
                    styles.priorityText,
                    { color: getPriorityColor(priority, theme) },
                  ]}
                >
                  P{priority}
                </Text>
              )}
              <View style={styles.cardTitleBlock}>
                <TwoLineClampText
                  style={styles.cardTitle}
                  text={entry.title || "Untitled"}
                />
              </View>
            </View>
          )}
          {isSmallScreen ? (
            <TwoLineClampText
              testID={`entry-title-${entry.id}`}
              style={styles.cardTitle}
              text={entry.title || "Untitled"}
            />
          ) : null}
          <TwoLineClampText
            style={styles.cardBody}
            text={entry.summary || getEntryBody(entry)}
          />
        </View>
        {!isSmallScreen ? (
          <View style={styles.cardActionCol}>
            <View style={styles.cardActionRow}>
              <Pressable
                style={styles.secondaryButton}
                onPress={(event) => {
                  event?.stopPropagation?.();
                  onStartEdit(entry);
                }}
                disabled={isBusy}
              >
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={(event) => {
                  event?.stopPropagation?.();
                  onToggleArchive(entry);
                }}
                disabled={isBusy}
              >
                <Text style={styles.secondaryButtonText}>{archiveLabel}</Text>
              </Pressable>
              {entry.category === "reminder" && entry.remind_at ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={(event) => {
                    event?.stopPropagation?.();
                    onDownloadIcs(entry.id);
                  }}
                  disabled={isBusy}
                >
                  <Text style={styles.secondaryButtonText}>
                    Add to Calendar
                  </Text>
                </Pressable>
              ) : null}
              <View style={[styles.tagPill, { backgroundColor: tag.bg }]}>
                <Text style={[styles.tagPillText, { color: tag.color }]}>
                  {tag.label}
                </Text>
              </View>
              {isWeb ? (
                <Pressable
                  style={[
                    styles.deleteButton,
                    isDeleteConfirm && styles.deleteButtonConfirm,
                  ]}
                  onPress={(event) => {
                    event?.stopPropagation?.();
                    onRequestDelete(entry.id);
                  }}
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <Text
                      style={[
                        styles.deleteText,
                        isDeleteConfirm && styles.deleteTextConfirm,
                      ]}
                    >
                      ...
                    </Text>
                  ) : isDeleteConfirm ? (
                    <Text style={[styles.deleteText, styles.deleteTextConfirm]}>
                      !
                    </Text>
                  ) : (
                    <Feather name="x" size={14} style={styles.deleteIcon} />
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.metaFooterRow}>
        <View testID={`entry-meta-col-${entry.id}`} style={styles.metaInfoCol}>
          {entry.remind_at ? (
            <View
              testID={`entry-reminder-pill-${entry.id}`}
              style={styles.reminderMetaPill}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="clock" size={12} color={theme.colors.brand} />
                <Text style={styles.reminderMetaText}>
                  {" "}
                  {displayRemindAt || ""}
                </Text>
              </View>
            </View>
          ) : null}
          <View style={styles.metaInfoRow}>
            <Text
              testID={`entry-updated-time-${entry.id}`}
              style={styles.metaText}
            >
              {displayDate || ""}
            </Text>
          </View>
        </View>

        {entryTags.length > 0 ? (
          <View
            testID={`entry-tags-row-${entry.id}`}
            style={styles.tagsRow}
            onLayout={(event) => {
              const nextWidth = event?.nativeEvent?.layout?.width;
              if (!Number.isFinite(nextWidth) || nextWidth <= 0) return;
              setTagsRowWidth(nextWidth);
            }}
          >
            {visibleTags.map((tagName, index) => (
              <View
                key={`${tagName}-${index}`}
                testID={`entry-tag-${entry.id}-${index}`}
                style={styles.itemTagPill}
                onLayout={(event) => {
                  const nextWidth = event?.nativeEvent?.layout?.width;
                  if (!Number.isFinite(nextWidth) || nextWidth <= 0) return;
                  setTagWidths((current) => {
                    if (current[index] === nextWidth) return current;
                    const updated = [...current];
                    updated[index] = nextWidth;
                    return updated;
                  });
                }}
              >
                <Text style={styles.itemTagText}>#{tagName}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default memo(SecondBrainEntryCard);
