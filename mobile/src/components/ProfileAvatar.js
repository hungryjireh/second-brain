import { Image, Text, View } from 'react-native';
import { theme } from '../theme';
import { initialsFromName } from '../utils/profileAvatar';

export default function ProfileAvatar({ avatarUrl, username, imageStyle, fallbackStyle, textStyle }) {
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={imageStyle} />;
  }

  return (
    <View style={[fallbackStyle, { backgroundColor: theme.colors.accent }]}>
      <Text style={textStyle}>{initialsFromName(username)}</Text>
    </View>
  );
}
