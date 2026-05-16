import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { apiRequest } from '../api';
import OpenBrainLogo from '../components/OpenBrainLogo';
import { theme } from '../theme';
import styles from './LandingScreenStyles';

function BackgroundVideo() {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <video
      style={styles.video}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    >
      <source src={require('../../assets/landing-page.mp4')} type="video/mp4" />
    </video>
  );
}

const NEVER_FORGET = [
  "billion dollar idea",
  "nobel prize winning thought",
  "oscar deserving film",
  "pulitzer prize winning story",
  "ted talk that would move thousands",
  "grammy nominated song"
];

export default function LandingScreen() {
  const { width } = useWindowDimensions();
  const [currentItem, setCurrentItem] = useState(
    NEVER_FORGET[Math.floor(Math.random() * NEVER_FORGET.length)]
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const longestNeverForgetItem = NEVER_FORGET.reduce(
    (longest, item) => (item.length > longest.length ? item : longest),
    ''
  );
  const titlePreview = `never forget your next ${longestNeverForgetItem}`;
  const maxTitleChars = Math.max(titlePreview.length, 1);
  const titleFontSize = Math.max(12, Math.min(34, Math.floor((width * 1.55) / maxTitleChars)));

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start(() => {
        setCurrentItem((prevItem) => {
          if (NEVER_FORGET.length <= 1) return prevItem;
          let nextItem = prevItem;
          while (nextItem === prevItem) {
            nextItem = NEVER_FORGET[Math.floor(Math.random() * NEVER_FORGET.length)];
          }
          return nextItem;
        });

        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }).start();
      });
    }, 2100);

    return () => clearInterval(interval);
  }, [titleOpacity]);

  async function submitSignup() {
    if (loading) return;

    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      setError('Please enter your name and email.');
      setSuccess('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiRequest('/launch-signups', {
        method: 'POST',
        body: {
          name: normalizedName,
          email: normalizedEmail,
          source: 'landing-page',
        },
      });

      setSuccess('stay tuned ❤️');
      setName('');
      setEmail('');
    } catch (err) {
      setError(err?.message || 'Unable to save your signup right now.');
    } finally {
      setLoading(false);
    }
  }

  function goToLearnMore() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.assign('/learn-more');
    }
  }

  function SecondBrainLogo() {
    return (
      <Text style={styles.footerLogoText}>
        second<Text style={styles.footerSecondBrainAccent}>brain</Text>
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundVideo />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text
            style={[styles.title, { fontSize: titleFontSize }]}
          >
            never forget your next{' '}
            <Animated.Text style={{ opacity: titleOpacity }}>
              {currentItem}
            </Animated.Text>
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="name"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            autoCapitalize="words"
            style={styles.input}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Pressable
            onPress={submitSignup}
            style={[
              styles.button,
              { backgroundColor: theme.colors.brand },
              loading ? styles.buttonDisabled : null,
            ]}
            accessibilityRole="button"
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: theme.colors.textLight }]}>
              {loading ? 'submitting...' : 'notify me'}
            </Text>
          </Pressable>
          <Pressable
            onPress={goToLearnMore}
            style={styles.learnMoreButton}
            accessibilityRole="button"
          >
            <Text style={styles.learnMoreButtonText}>learn more</Text>
          </Pressable>

          {success ? (
            <Text style={[styles.helperText, { color: theme.colors.textLight, textAlign: 'center' }]}>
              {success}
            </Text>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
        <View style={styles.footer} accessibilityRole="text">
          <OpenBrainLogo style={styles.footerLogoText} accentStyle={styles.footerOpenBrainAccent} />
          <Text style={styles.footerSeparator}> + </Text>
          <SecondBrainLogo />
        </View>
      </View>
    </View>
  );
}
