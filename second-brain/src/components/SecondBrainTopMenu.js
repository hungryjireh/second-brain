import { Image, Text } from "react-native";
import { theme } from "../theme";
import appStyles from "../../App.styles";
import SecondBrainBackButton from "./SecondBrainBackButton";

export function SecondBrainHeaderBrand() {
  return (
    <Image
      source={require("../../assets/icon_transparent.png")}
      style={appStyles.headerBrandLogo}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Second Brain logo"
    />
  );
}

export function SecondBrainHeaderLiveStatus() {
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return <Text style={appStyles.headerLiveText}>{dateLabel}</Text>;
}

export function SecondBrainHeaderBack({ navigation }) {
  return (
    <SecondBrainBackButton
      onPress={() => {
        if (navigation?.canGoBack?.()) {
          navigation.goBack();
          return;
        }
        navigation?.navigate?.("SecondBrain");
      }}
      accessibilityLabel="Back to Second Brain"
      style={appStyles.headerBackButton}
    />
  );
}

export function buildSecondBrainHeaderOptions({
  hideDate,
  isRootScreen = false,
  navigation,
}) {
  return {
    headerTitle: () => <SecondBrainHeaderBrand />,
    headerTitleAlign: "center",
    headerBackVisible: false,
    headerLeft: isRootScreen
      ? () => null
      : () => <SecondBrainHeaderBack navigation={navigation} />,
    headerRight: hideDate ? undefined : () => <SecondBrainHeaderLiveStatus />,
    headerStyle: { backgroundColor: theme.colors.bgBase },
    headerShadowVisible: false,
  };
}
