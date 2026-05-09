import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.bgSurface,
    color: theme.colors.textPrimary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  inputMultiline: {
    minHeight: 72,
  },
  button: {
    backgroundColor: theme.colors.brand,
    borderRadius: 10,
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  buttonText: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
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
}) {
  return (
    <View>
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
      <Pressable style={[styles.button, { marginBottom: buttonMarginBottom }]} onPress={onSubmit} disabled={disabled}>
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}
