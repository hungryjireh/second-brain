import { memo, useEffect, useRef, useState } from "react";
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

function TwoLineClampText({ text, style, testID }) {
  const sourceText = String(text || "").trim();
  const [displayText, setDisplayText] = useState(sourceText);
  const [didClamp, setDidClamp] = useState(false);

  useEffect(() => {
    setDisplayText(sourceText);
    setDidClamp(false);
  }, [sourceText]);

  return (
    <Text
      testID={testID}
      style={style}
      numberOfLines={2}
      onTextLayout={(event) => {
        if (didClamp || !sourceText) return;
        const lines = event?.nativeEvent?.lines;
        if (!Array.isArray(lines) || lines.length <= 2) return;
        const firstTwoLinesText = lines
          .slice(0, 2)
          .map((line) => String(line?.text || ""))
          .join("")
          .trimEnd();
        const nextDisplayText = firstTwoLinesText
          ? `${firstTwoLinesText}...`
          : "...";
        setDisplayText(nextDisplayText);
        setDidClamp(true);
      }}
    >
      {displayText}
    </Text>
  );
}

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
      style={styles.card}
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
                <View style={styles.mobileTitleActionRow}>
                  <View style={[styles.tagPill, { backgroundColor: tag.bg }]}>
                    <Text style={[styles.tagPillText, { color: tag.color }]}>
                      {tag.label}
                    </Text>
                  </View>
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
      <View style={styles.metaInfoRow}>
        {entry.remind_at ? (
          <>
            <View style={styles.reminderMetaPill}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="clock" size={12} color={theme.colors.brand} />
                <Text style={styles.reminderMetaText}>
                  {" "}
                  {displayRemindAt || ""}
                </Text>
              </View>
            </View>
            <Text style={styles.metaDot}>•</Text>
          </>
        ) : null}
        <Text style={styles.metaText}>{displayDate || ""}</Text>
      </View>

      {Array.isArray(entry.tags) && entry.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {entry.tags.map((tagName) => (
            <View key={tagName} style={styles.itemTagPill}>
              <Text style={styles.itemTagText}>#{tagName}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export default memo(SecondBrainEntryCard);
