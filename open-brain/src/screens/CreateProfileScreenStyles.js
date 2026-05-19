import { StyleSheet } from "react-native";
import { theme } from "../theme";
import { commonFormCompositions } from "../styles/commonStyles";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgBase },
  content: { flex: 1, padding: 16, justifyContent: "center", gap: 10 },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: theme.fonts.serif,
    marginBottom: 6,
  },
  input: {
    ...commonFormCompositions.raisedInput,
    backgroundColor: theme.colors.bgSurface,
    padding: 12,
  },
  button: {
    ...commonFormCompositions.primaryAccentButton,
    paddingVertical: 12,
    marginTop: 6,
  },
  buttonText: {
    ...commonFormCompositions.primaryAccentButtonText,
    color: theme.colors.accentOnSolid,
  },
  error: { color: theme.colors.danger },
});

export default styles;
