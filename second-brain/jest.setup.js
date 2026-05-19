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

jest.mock('expo-audio', () => {
  const requestRecordingPermissionsAsync = jest.fn().mockResolvedValue({ granted: true });
  const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);
  const recorder = {
    uri: 'file:///tmp/mock-recording.m4a',
    prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
    record: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
  };
  return {
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    RecordingPresets: { HIGH_QUALITY: {} },
    useAudioRecorder: jest.fn(() => recorder),
    useAudioRecorderState: jest.fn(() => ({ isRecording: false })),
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    getItem: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItem: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    removeItem: jest.fn(async (key) => {
      store.delete(key);
    }),
    getAllKeys: jest.fn(async () => Array.from(store.keys())),
    multiRemove: jest.fn(async (keys) => {
      keys.forEach(key => store.delete(key));
    }),
    clear: jest.fn(async () => {
      store.clear();
    }),
  };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: {} },
    manifest2: { extra: {} },
  },
}));
