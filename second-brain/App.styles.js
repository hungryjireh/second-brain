import { StyleSheet } from "react-native";
import { theme } from "./src/theme";

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  loadingIndicator: {
    flex: 1,
  },
  headerBrandLogo: {
    width: 130,
    height: 40,
  },
  headerLiveText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: theme.fonts.regular,
    paddingRight: 12,
  },
  headerBackButton: {},
  headerLiveDot: {
    color: theme.colors.brand,
    fontSize: 12,
  },
});

export default styles;
