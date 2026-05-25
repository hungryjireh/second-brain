import { memo, useCallback, useMemo } from "react";
import { FlatList, Text, Platform, View } from "react-native";
import MarkdownBody from "./MarkdownBody";

const DEFAULT_MAX_WEB_RENDERED_MESSAGES = 200;

const ConversationMessageRow = memo(
  function ConversationMessageRow({ sender, text, fileUrls, styles }) {
    const fromHuman = sender === "human";
    return (
      <View
        style={[
          styles.conversationRow,
          fromHuman
            ? styles.conversationRowHuman
            : styles.conversationRowAssistant,
        ]}
      >
        <View
          style={[
            styles.conversationBubble,
            fromHuman
              ? styles.conversationBubbleHuman
              : styles.conversationBubbleAssistant,
          ]}
        >
          <Text style={styles.conversationSender}>
            {fromHuman ? "You" : "Assistant"}
          </Text>
          <MarkdownBody text={text} fileUrls={fileUrls} styles={styles} />
        </View>
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.sender === nextProps.sender &&
    prevProps.text === nextProps.text &&
    prevProps.fileUrls === nextProps.fileUrls &&
    prevProps.styles === nextProps.styles,
);

export default function SecondBrainConversationList({
  messages,
  styles,
  style,
  contentContainerStyle,
  listRef,
  onListLayout,
  onListContentSizeChange,
  maxWebRenderedMessages,
  showWebHiddenMessageNotice = false,
  hiddenMessageNoticeStyle,
}) {
  const isWeb = Platform.OS === "web";
  const webRenderLimit =
    typeof maxWebRenderedMessages === "number"
      ? maxWebRenderedMessages
      : DEFAULT_MAX_WEB_RENDERED_MESSAGES;
  const normalizedMessages = Array.isArray(messages) ? messages : [];

  const renderedMessages = useMemo(() => {
    if (
      !isWeb ||
      !showWebHiddenMessageNotice ||
      normalizedMessages.length <= webRenderLimit
    ) {
      return normalizedMessages;
    }
    return normalizedMessages.slice(0, webRenderLimit);
  }, [isWeb, normalizedMessages, showWebHiddenMessageNotice, webRenderLimit]);

  const hasHiddenMessages = Boolean(
    isWeb &&
    showWebHiddenMessageNotice &&
    normalizedMessages.length > renderedMessages.length,
  );

  const data = useMemo(
    () =>
      hasHiddenMessages
        ? [
            ...renderedMessages,
            {
              id: "__hidden_messages_notice__",
              sender: "assistant",
              text: `Showing first ${webRenderLimit} messages on web for performance.`,
              fileUrls: [],
              isNotice: true,
            },
          ]
        : renderedMessages,
    [hasHiddenMessages, renderedMessages, webRenderLimit],
  );

  const keyExtractor = useCallback(
    (item, index) =>
      item.id ||
      (item.isNotice
        ? "__hidden_messages_notice__"
        : `${item.sender || "assistant"}-${index}`),
    [],
  );

  const renderItem = useCallback(
    ({ item }) =>
      item.isNotice ? (
        <Text style={hiddenMessageNoticeStyle || styles.entryPanelSummary}>
          {item.text}
        </Text>
      ) : (
        <ConversationMessageRow
          sender={item.sender}
          text={item.text}
          fileUrls={item.fileUrls}
          styles={styles}
        />
      ),
    [hiddenMessageNoticeStyle, styles],
  );

  return (
    <FlatList
      ref={listRef}
      style={style}
      contentContainerStyle={contentContainerStyle}
      onLayout={onListLayout}
      onContentSizeChange={onListContentSizeChange}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      removeClippedSubviews={!isWeb}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
    />
  );
}
