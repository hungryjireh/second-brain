import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { theme } from '../theme';

function normalizeThoughtText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u2028|\u2029/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function parsePostedThought(text) {
  const normalized = normalizeThoughtText(text);
  if (!normalized) return { title: '', blocks: [], hasTitle: false };
  const lines = normalized.split('\n');
  let firstLineIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim()) {
      firstLineIndex = i;
      break;
    }
  }
  if (firstLineIndex < 0) return { title: '', blocks: [], hasTitle: false };
  const title = lines[firstLineIndex].trim();
  const body = lines.slice(firstLineIndex + 1).join('\n').trim();
  if (!body) return { title: '', blocks: [{ text: title, isQuote: false }], hasTitle: false };
  const blocks = body
    .split(/\n\s*\n/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const unwrapped = part.replace(/^>\s?/gm, '').trim();
      const isQuote = /^>\s?/.test(part) || /^".+"$/.test(part) || /^“.+”$/.test(part) || /^'.+'$/.test(part);
      return { text: isQuote ? unwrapped : part, isQuote };
    });
  return { title, blocks, hasTitle: true };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgSurface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minWidth: 0,
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    flex: 1,
    flexShrink: 1,
  },
  streak: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
  },
  heading: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 29,
    lineHeight: 34,
    marginTop: 12,
    flexShrink: 1,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    minWidth: 0,
  },
  prompt: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    fontStyle: 'italic',
    flex: 1,
    flexShrink: 1,
  },
  refreshButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderColor: theme.colors.border,
    borderWidth: 1,
    backgroundColor: theme.colors.bgRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  divider: {
    flex: 1,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 12,
  },
  postedScroll: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgSurface,
    minHeight: 120,
  },
  postedScrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    backgroundColor: theme.colors.bgSurface,
    color: theme.colors.textPrimary,
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    lineHeight: 27,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  postedText: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 23,
  },
  postedBlocks: {
    gap: 10,
  },
  postedTitle: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 12,
  },
  postedQuoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: '#1d9e75',
    paddingLeft: 10,
  },
  postedQuoteText: {
    color: theme.colors.textPrimary,
    fontStyle: 'italic',
    opacity: 0.82,
  },
  footer: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  remaining: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  visibilityButton: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 999,
    backgroundColor: theme.colors.bgRaised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingLeft: 6,
    paddingRight: 10,
    maxWidth: '100%',
  },
  toggleTrack: {
    width: 34,
    height: 18,
    borderRadius: 999,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  visibilityText: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    flexShrink: 1,
  },
  button: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    backgroundColor: 'transparent',
    borderRadius: 10,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  buttonText: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    lineHeight: 16,
  },
  helperText: {
    color: theme.colors.textMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 10,
  },
  error: {
    color: theme.colors.danger,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});

export default function OpenBrainThoughtComposer({
  value,
  onChangeText,
  placeholder,
  buttonLabel,
  onSubmit,
  disabled = false,
  multiline = false,
  maxLength,
  buttonMarginBottom = 0,
  dateLabel,
  timeLabel,
  streakCount = 0,
  heading = "What's on your mind?",
  prompt,
  onRefreshPrompt,
  canRefreshPrompt = false,
  visibility = 'public',
  onToggleVisibility,
  isPosted = false,
  error = '',
  showRemaining = true,
}) {
  const { height: viewportHeight } = useWindowDimensions();
  const minInputHeight = 120;
  const maxInputHeight = useMemo(() => Math.max(minInputHeight, Math.floor(viewportHeight * 0.52)), [viewportHeight]);
  const [contentHeight, setContentHeight] = useState(minInputHeight);
  const remaining = typeof maxLength === 'number' ? maxLength - String(value || '').length : null;
  const submitDisabled = disabled || isPosted;
  const trackActive = visibility === 'public';
  const clampedInputHeight = Math.min(Math.max(contentHeight, minInputHeight), maxInputHeight);
  const shouldScrollInput = clampedInputHeight >= maxInputHeight;
  const postedThought = useMemo(() => parsePostedThought(value), [value]);

  return (
    <View style={[styles.card, { marginBottom: buttonMarginBottom, flex: 1 }]}>
      <View style={styles.content}>
        {!!dateLabel && (
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrow}>{dateLabel}{timeLabel ? ` • ${timeLabel}` : ''}</Text>
            <Text style={styles.streak}>🔥 {streakCount}</Text>
          </View>
        )}
        <Text style={styles.heading}>{heading}</Text>
        {!isPosted && (
          <View style={styles.promptRow}>
            <Text style={styles.prompt}>{prompt || placeholder}</Text>
            {!!onRefreshPrompt && (
              <Pressable style={styles.refreshButton} onPress={onRefreshPrompt} disabled={!canRefreshPrompt}>
                <Text style={styles.refreshText}>↻</Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={styles.divider}>
          {isPosted ? (
            <ScrollView style={styles.postedScroll} contentContainerStyle={styles.postedScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.postedBlocks}>
                {postedThought.hasTitle ? <Text style={styles.postedTitle}>{postedThought.title}</Text> : null}
                {postedThought.blocks.map((block, index) => (
                  <View key={`posted-thought-block-${index}`} style={block.isQuote ? styles.postedQuoteBlock : null}>
                    <Text style={[styles.postedText, block.isQuote ? styles.postedQuoteText : null]}>{block.text}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, multiline && styles.inputMultiline, multiline && { height: clampedInputHeight }]}
              multiline={multiline}
              maxLength={maxLength}
              onContentSizeChange={multiline ? event => setContentHeight(event.nativeEvent.contentSize.height) : undefined}
              scrollEnabled={multiline ? shouldScrollInput : undefined}
              autoCapitalize="none"
            />
          )}
          {isPosted && <Text style={styles.helperText}>you can't edit or delete this. it's yours now.</Text>}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {showRemaining && remaining !== null && <Text style={styles.remaining}>{remaining} left</Text>}
          <Pressable
            style={[styles.visibilityButton, isPosted && { opacity: 0.55 }]}
            onPress={onToggleVisibility}
            disabled={isPosted || !onToggleVisibility}
          >
            <View style={[styles.toggleTrack, { backgroundColor: trackActive ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.12)', alignItems: trackActive ? 'flex-end' : 'flex-start', paddingHorizontal: 2 }]}>
              <View style={[styles.toggleThumb, { backgroundColor: trackActive ? theme.colors.brand : theme.colors.textSecondary }]} />
            </View>
            <Text style={styles.visibilityText}>{visibility}</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.button, submitDisabled && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitDisabled}
        >
          <Text style={[styles.buttonText, submitDisabled && { color: theme.colors.textSecondary }]}>{buttonLabel}</Text>
        </Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
