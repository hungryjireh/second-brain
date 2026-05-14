jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

jest.mock('@expo-google-fonts/dm-sans', () => ({
  DMSans_300Light: 'DMSans_300Light',
  DMSans_400Regular: 'DMSans_400Regular',
  DMSans_600SemiBold: 'DMSans_600SemiBold',
  DMSans_700Bold: 'DMSans_700Bold',
  useFonts: () => [true],
}));

jest.mock('@expo-google-fonts/dm-serif-display', () => ({
  DMSerifDisplay_400Regular: 'DMSerifDisplay_400Regular',
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const MockIcon = props => React.createElement('Icon', props, props.children);
  return { Feather: MockIcon };
});

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
