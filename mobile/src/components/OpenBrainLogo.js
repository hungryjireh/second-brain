import { Text } from 'react-native';

export default function OpenBrainLogo({
  style,
  accentStyle,
  textProps,
  numberOfLines = 1,
  adjustsFontSizeToFit = true,
  minimumFontScale = 0.82,
}) {
  return (
    <Text
      style={[style, textProps]}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
    >
      open<Text style={accentStyle}>brain</Text>
    </Text>
  );
}
