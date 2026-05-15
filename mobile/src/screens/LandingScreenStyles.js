import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  content: {
    flex: 1,
    zIndex: 2,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 8,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 20,
    marginBottom: '4%',
  },
  title: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 10,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
    fontSize: 15,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  helperText: {
    marginTop: 12,
    color: '#d9e9ff',
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    marginTop: 12,
    color: '#ffb3b3',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingBottom: 8,
  },
  footerSeparator: {
    color: 'rgba(255, 255, 255, 0.84)',
    fontSize: 15,
    fontWeight: '600',
  },
  footerLogoText: {
    color: theme.colors.textPrimary,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.3,
    fontFamily: theme.fonts.serif,
  },
  footerOpenBrainAccent: {
    color: theme.colors.accent,
  },
  footerSecondBrainAccent: {
    color: theme.colors.brand,
  },
});

export default styles;
