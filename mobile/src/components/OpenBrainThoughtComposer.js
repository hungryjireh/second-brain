import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import styles from './OpenBrainThoughtComposer.styles';
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

function applyInlineMarkdown(text, selection, marker, placeholder) {
  const current = String(text || '');
  const start = Math.max(0, selection?.start ?? current.length);
  const end = Math.max(start, selection?.end ?? start);
  const before = current.slice(0, start);
  const selected = current.slice(start, end);
  const after = current.slice(end);
  const token = String(marker || '');
  const seed = String(placeholder || 'text');

  if (start === end) {
    return {
      text: `${before}${token}${seed}${token}${after}`,
      selection: { start: start + token.length, end: start + token.length + seed.length },
    };
  }

  return {
    text: `${before}${token}${selected}${token}${after}`,
    selection: { start: start + token.length, end: end + token.length },
  };
}

function applyLinePrefix(text, selection, prefixBuilder) {
  const current = String(text || '');
  const rawStart = Math.max(0, selection?.start ?? current.length);
  const rawEnd = Math.max(rawStart, selection?.end ?? rawStart);
  const lineStart = current.lastIndexOf('\n', Math.max(0, rawStart - 1)) + 1;
  const lineEndIndex = current.indexOf('\n', rawEnd);
  const lineEnd = lineEndIndex === -1 ? current.length : lineEndIndex;
  const block = current.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const formatted = lines.map((line, idx) => `${prefixBuilder(idx)}${line}`);
  const nextBlock = formatted.join('\n');
  const before = current.slice(0, lineStart);
  const after = current.slice(lineEnd);
  return {
    text: `${before}${nextBlock}${after}`,
    selection: { start: lineStart, end: lineStart + nextBlock.length },
  };
}

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
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const remaining = typeof maxLength === 'number' ? maxLength - String(value || '').length : null;
  const submitDisabled = disabled || isPosted;
  const trackActive = visibility === 'public';
  const clampedInputHeight = Math.min(Math.max(contentHeight, minInputHeight), maxInputHeight);
  const shouldScrollInput = clampedInputHeight >= maxInputHeight;
  const postedThought = useMemo(() => parsePostedThought(value), [value]);
  const handleFormatPress = (marker, placeholder) => {
    if (disabled || isPosted) return;
    const next = applyInlineMarkdown(value, selection, marker, placeholder);
    onChangeText(next.text);
    setSelection(next.selection);
  };
  const handleBulletListPress = () => {
    if (disabled || isPosted) return;
    const next = applyLinePrefix(value, selection, () => '- ');
    onChangeText(next.text);
    setSelection(next.selection);
  };
  const handleNumberedListPress = () => {
    if (disabled || isPosted) return;
    const next = applyLinePrefix(value, selection, index => `${index + 1}. `);
    onChangeText(next.text);
    setSelection(next.selection);
  };

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
          {!isPosted && (
            <View style={styles.formatToolbar}>
              <Pressable
                style={styles.formatButton}
                onPress={() => handleFormatPress('**', 'bold')}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Bold"
                accessibilityHint="Formats selected text as bold"
              >
                <Text style={[styles.formatButtonText, disabled && { color: theme.colors.textSecondary }]}>B</Text>
              </Pressable>
              <Pressable
                style={styles.formatButton}
                onPress={() => handleFormatPress('*', 'italic')}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Italic"
                accessibilityHint="Formats selected text as italic"
              >
                <Text style={[styles.formatButtonText, disabled && { color: theme.colors.textSecondary }]}>I</Text>
              </Pressable>
              <Pressable
                style={styles.formatButton}
                onPress={() => handleFormatPress('__', 'underline')}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Underline"
                accessibilityHint="Formats selected text as underlined"
              >
                <Text style={[styles.formatButtonText, styles.formatButtonTextUnderline, disabled && { color: theme.colors.textSecondary }]}>U</Text>
              </Pressable>
              <Pressable
                style={styles.formatButton}
                onPress={handleBulletListPress}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Bulleted list"
                accessibilityHint="Formats selected lines as a bulleted list"
              >
                <Text style={[styles.formatButtonText, disabled && { color: theme.colors.textSecondary }]}>•</Text>
              </Pressable>
              <Pressable
                style={[styles.formatButton, styles.formatButtonWide]}
                onPress={handleNumberedListPress}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Numbered list"
                accessibilityHint="Formats selected lines as a numbered list"
              >
                <Text style={[styles.formatButtonText, disabled && { color: theme.colors.textSecondary }]}>1.</Text>
              </Pressable>
            </View>
          )}
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
              selection={selection}
              onSelectionChange={event => setSelection(event.nativeEvent.selection)}
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
