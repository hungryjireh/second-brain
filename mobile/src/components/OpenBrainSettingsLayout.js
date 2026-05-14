import { ScrollView, Text, View } from 'react-native';
import OpenBrainBottomNav from './OpenBrainBottomNav';
import OpenBrainTopMenu from './OpenBrainTopMenu';
import styles from './OpenBrainSettingsLayout.styles';

export default function OpenBrainSettingsLayout({
  token,
  navigation,
  title,
  copy,
  currentRoute = 'OpenBrainSettings',
  headerStyle,
  contentStyle,
  scroll = false,
  scrollStyle,
  scrollContentContainerStyle,
  children,
}) {
  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} token={token} />
      <View style={[styles.content, contentStyle]}>
        {(title || copy) && (
          <View style={[styles.header, headerStyle]}>
            {!!title && <Text style={styles.title}>{title}</Text>}
            {!!copy && <Text style={styles.copy}>{copy}</Text>}
          </View>
        )}
        {scroll ? (
          <ScrollView style={scrollStyle} contentContainerStyle={scrollContentContainerStyle} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </View>
      <OpenBrainBottomNav navigation={navigation} currentRoute={currentRoute} />
    </View>
  );
}
