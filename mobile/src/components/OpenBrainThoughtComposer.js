import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../theme';

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
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
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
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  prompt: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    fontStyle: 'italic',
    flex: 1,
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
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 12,
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
    backgroundColor: theme.colors.bgSurface,
    color: theme.colors.textPrimary,
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    lineHeight: 27,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
}) {
  const remaining = typeof maxLength === 'number' ? maxLength - String(value || '').length : null;
  const submitDisabled = disabled || isPosted;
  const trackActive = visibility === 'public';

  return (
    <View style={[styles.card, { marginBottom: buttonMarginBottom }]}>
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
            <Text style={styles.postedText}>{value}</Text>
          ) : (
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, multiline && styles.inputMultiline]}
              multiline={multiline}
              maxLength={maxLength}
              autoCapitalize="none"
            />
          )}
          {isPosted && <Text style={styles.helperText}>you can't edit or delete this. it's yours now.</Text>}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {remaining !== null && <Text style={styles.remaining}>{remaining} left</Text>}
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
