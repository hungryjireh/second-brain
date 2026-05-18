import { Text } from 'react-native';

function coerceNumber(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export default function OpenBrainLogo({
  style,
  accentStyle,
  textProps,
  numberOfLines = 1,
  adjustsFontSizeToFit = true,
  minimumFontScale = 0.82,
}) {
  const safeNumberOfLines = Math.max(1, Math.floor(coerceNumber(numberOfLines, 1)));
  const safeAdjustsFontSizeToFit = adjustsFontSizeToFit === true;
  const safeMinimumFontScale = Math.max(0.1, coerceNumber(minimumFontScale, 0.82));

  return (
    <Text
      style={[style, textProps]}
      numberOfLines={safeNumberOfLines}
      adjustsFontSizeToFit={safeAdjustsFontSizeToFit}
      minimumFontScale={safeMinimumFontScale}
    >
      open<Text style={accentStyle}>brain</Text>
    </Text>
  );
}
