import { Text, View } from 'react-native';

export default function OpenBrainThoughtCard({ item, date }) {
  const body = item?.text || '';
  return (
    <View>
      <Text>{item?.profile?.username || 'openbrain.user'} · {date || 'just now'}</Text>
      <Text>{body}</Text>
    </View>
  );
}
