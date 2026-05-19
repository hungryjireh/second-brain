import { StyleSheet } from "react-native";
import { theme } from "../theme";
import { commonLayoutStyles } from "../styles/commonStyles";

const styles = StyleSheet.create({
  container: { ...commonLayoutStyles.screenBase },
  content: { flex: 1, padding: 16, gap: 10 },
  thoughtViewport: { flex: 1, minHeight: 0 },
  thoughtScroll: { flex: 1 },
  thoughtScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 8,
  },
  thoughtCardWrap: {
    width: "100%",
    maxWidth: 760,
  },
  error: { color: theme.colors.danger },
});

export default styles;
