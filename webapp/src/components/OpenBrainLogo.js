import { Text } from 'react-native';

export default function OpenBrainLogo({ style, accentStyle, textProps }) {
  return (
    <Text style={style} {...(textProps || {})}>
      open<Text style={accentStyle}>brain</Text>
    </Text>
  );
}
