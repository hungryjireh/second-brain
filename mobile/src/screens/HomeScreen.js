import { useRef } from 'react';
import { Animated, Text, View, Pressable, useWindowDimensions } from 'react-native';
import styles from './HomeScreenStyles';
import OpenBrainThoughtCard from '../components/OpenBrainThoughtCard';
import OpenBrainLogo from '../components/OpenBrainLogo';
import SecondBrainEntryCard from '../components/SecondBrainEntryCard';
import { theme } from '../theme';
import secondBrainCardStyles from './SecondBrainScreen.styles';

const openBrainFeatures = [
  'No edits, no deletes - just one thing you want to share with the world each day',
  'Discover what everyone else is thinking about daily, from the personal to the profound',
  'View profiles and follow the people whose thinking you want more of',
];

const secondBrainFeatures = [
  'Our Telegram bot organizes your messy written and spoken thoughts instantly',
  'View your knowledge dump on our platform, Markdown and all. Your knowledge stays beautiful and searchable forever',
  'Your billion dollar idea, granny\'s secret recipe, LLM exported conversations and everything in between all in one place',
];

const workflowSteps = [
  {
    num: 'STEP 01',
    title: 'Spark a thought',
    desc: 'Post a rough idea while it is still fresh.',
    icon: '💡',
  },
  {
    num: 'STEP 02',
    title: 'Get fast feedback',
    desc: 'Learn from responses to sharpen your framing and direction.',
    icon: '🔍',
  },
  {
    num: 'STEP 03',
    title: 'Save what matters',
    desc: 'Move your favorite ideas into ',
    descSuffix: ' for your own exploration.',
    icon: '📥',
  },
  {
    num: 'STEP 04',
    title: 'Build over time',
    desc: 'Turn saved ideas into durable knowledge for future projects.',
    icon: '🗂️',
  },
];

const sampleOpenBrainEntry = {
  id: 'home-preview-openbrain-thought',
  user_id: 'home-preview-user',
  username: 'alex.openbrain',
  relativeTime: 'just now',
  text: 'Could onboarding ask for a single user outcome first, then tailor setup around that?',
  tags: ['product', 'ux', 'onboarding'],
  createdAt: '2026-05-12T15:50:00.000Z',
  profile: {
    username: 'alex.openbrain',
    streak_count: 7,
    is_self: false,
    is_following: false,
  },
  reactions: {
    felt_this: 3,
    me_too: 1,
    made_me_think: 2,
    mine: {},
  },
  save_count: 5,
};

const sampleSecondBrainEntry = {
  id: 'home-preview-secondbrain-entry',
  category: 'thought',
  priority: 6,
  title: 'Saved from feed',
  summary: 'Inverted onboarding: map outcomes first, then guide user setup by intent.',
  raw_text: 'Inverted onboarding: map outcomes first, then guide user setup by intent.',
  is_archived: false,
  remind_at: null,
  tags: ['product', 'decisionlog'],
};

function ProductCard({ number, tagline, description, features, buttonLabel, onPress, isOpenBrain, compactLogo }) {
  const compactStyle = isOpenBrain ? styles.productLogoTextCompact : styles.productSecondLogoTextCompact;
  const logoStyle = compactLogo ? [styles.productLogoText, compactStyle] : styles.productLogoText;

  return (
    <View style={styles.productCard}>
      <Text style={styles.productNumber}>{number}</Text>
      <View style={styles.productTitleWrap}>
        {isOpenBrain ? (
          <OpenBrainLogo
            style={[styles.openBrainLogoText, logoStyle]}
            accentStyle={[styles.openBrainLogoAccent, styles.productLogoAccent]}
            textProps={styles.productLogoNoWrap}
          />
        ) : (
          <SecondBrainLogo style={logoStyle} accentStyle={styles.productSecondLogoAccent} textProps={styles.productLogoNoWrap} />
        )}
      </View>
      <Text style={styles.productTagline}>{tagline}</Text>
      <Text style={styles.productDescription}>{description}</Text>
      <View style={styles.featureList}>
        {features.map(item => (
          <View key={item} style={styles.featureRow}>
            <View style={[styles.featureDot, isOpenBrain ? styles.openAccentBorder : styles.secondAccentBorder]}>
              <View style={[styles.featureDotInner, isOpenBrain ? styles.openAccentBg : styles.secondAccentBg]} />
            </View>
            <Text style={styles.featureText}>{item}</Text>
          </View>
        ))}
      </View>
      <Pressable style={[styles.productButton, isOpenBrain ? styles.openAccentBg : styles.secondAccentBg]} onPress={onPress}>
        <Text style={styles.buttonLabelText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

function SecondBrainLogo({ style, accentStyle, textProps }) {
  return (
    <Text style={[styles.secondBrainLogoText, style, textProps]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
      second<Text style={[styles.secondBrainLogoAccent, accentStyle]}>brain</Text>
    </Text>
  );
}

export default function HomeScreen({ navigation, token }) {
  const { width, height } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const compactLogo = width <= 390;
  const isSmallScreen = width <= 390;
  const primaryAction = token ? () => navigation.navigate('Apps') : () => navigation.navigate('Login');
  const currentYear = new Date().getFullYear();
  const introOpacity = scrollY.interpolate({
    inputRange: [0, Math.max(1, height * 0.45)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const poemSectionStart = height;
  const poemOpacity = scrollY.interpolate({
    inputRange: [Math.max(0, poemSectionStart + (height * 0.15)), Math.max(1, poemSectionStart + (height * 0.95))],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      stickyHeaderIndices={[0, 1, 2, 3, 4, 5, 6, 7]}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true },
      )}
      scrollEventThrottle={16}
    >
      {!token ? (
        <View style={styles.topLoginBar}>
          <Pressable style={styles.eyebrowLoginButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.eyebrowLoginText}>Login</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.introHero, { minHeight: height }]}>
        <Animated.Text style={[styles.introHeroText, { opacity: introOpacity }]}>
          what if you only had 1 thought a day?
        </Animated.Text>
      </View>

      <View style={[styles.introHero, { minHeight: height }]}>
        <Animated.Text style={[styles.introHeroPoem, { opacity: poemOpacity }]}>
          {`When she doesn’t respond,
I know she’s used up all her words,
so I slowly whisper I love you
thirty-two and a third times.
After that, we just sit on the line
and listen to each other breathe.`}
        </Animated.Text>
      </View>

      <View style={[styles.introHero, { minHeight: height }]}>
      </View>

      <View style={styles.hero}>
        <View style={[styles.dualProductSection, { minHeight: height }]}>
          <View style={styles.dualProductColumn}>
            <SecondBrainLogo style={styles.dualProductLogo} />
            <Text style={styles.dualProductDescription}>
              Placeholder description for SecondBrain.
            </Text>
            <Pressable
              style={[styles.dualProductButton, styles.secondAccentBg]}
              onPress={token ? () => navigation.navigate('SecondBrain') : primaryAction}
            >
              <Text style={styles.buttonLabelText}>Try SecondBrain</Text>
            </Pressable>
          </View>
          {!isSmallScreen ? (
            <View style={styles.dualProductDividerWrap}>
              <View style={styles.dualProductDivider} />
            </View>
          ) : null}
          <View style={styles.dualProductColumn}>
            <OpenBrainLogo style={[styles.openBrainLogoText, styles.dualProductLogo]} accentStyle={styles.openBrainLogoAccent} />
            <Text style={styles.dualProductDescription}>
              Placeholder description for OpenBrain.
            </Text>
            <Pressable
              style={[styles.dualProductButton, styles.openAccentBg]}
              onPress={token ? () => navigation.navigate('OpenBrainFeed') : primaryAction}
            >
              <Text style={styles.buttonLabelText}>Try OpenBrain</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLeft}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrow}>Never forget what you don't want to</Text>
          </View>
        </View>
        <View style={styles.heroTitleWrap}>
          <Text style={styles.heroTitleScript}>Ideas that</Text>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroTitleBold}>move</Text>
            <Text style={styles.heroTitleScript}>at</Text>
          </View>
          <Text style={styles.heroTitleScript}>your pace</Text>
        </View>
        <Text style={styles.heroSubcopy}>
          <OpenBrainLogo style={[styles.openBrainLogoText, styles.heroLogoInline]} accentStyle={styles.openBrainLogoAccent} /> lets you share thoughts in real time. <SecondBrainLogo style={styles.heroLogoInline} /> turns
          them into lasting
          knowledge. Together, they close the loop between inspiration and clarity.
        </Text>
        <View style={[styles.heroActions, isSmallScreen ? styles.heroActionsSmallScreen : null]}>
          <Pressable
            style={[styles.heroButton, styles.openButton, isSmallScreen ? styles.heroButtonSmallScreen : null]}
            onPress={token ? () => navigation.navigate('OpenBrainFeed') : primaryAction}
          >
            <Text style={styles.buttonLabelText}>Try Openbrain</Text>
          </Pressable>
          <Pressable
            style={[styles.heroButton, styles.secondButton, isSmallScreen ? styles.heroButtonSmallScreen : null]}
            onPress={token ? () => navigation.navigate('SecondBrain') : primaryAction}
          >
            <Text style={styles.buttonLabelText}>Try SecondBrain</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.previewWrap}>
        <View style={styles.previewPanelTop}>
          <Text style={styles.previewBadgeOpen}>
            Openbrain live feed
          </Text>
          <View style={styles.previewCardOpen}>
            <OpenBrainThoughtCard
              item={{
                id: sampleOpenBrainEntry.id,
                user_id: sampleOpenBrainEntry.user_id,
                text: `${sampleOpenBrainEntry.text}\n\n${sampleOpenBrainEntry.tags.map(tag => `#${tag}`).join(' ')}`,
                created_at: sampleOpenBrainEntry.createdAt,
                profile: sampleOpenBrainEntry.profile,
                reactions: sampleOpenBrainEntry.reactions,
                save_count: sampleOpenBrainEntry.save_count,
              }}
              date={sampleOpenBrainEntry.relativeTime}
              feedBody
              onOpenProfile={() => {}}
              onToggleFollow={() => {}}
              onReact={() => {}}
              onShare={() => {}}
              onAddToSecondBrain={() => {}}
            />
          </View>
        </View>
        <View style={styles.previewPanelBottom}>
          <Text style={styles.previewBadgeSecond}>
            SecondBrain archive
          </Text>
          <View style={styles.previewCardSecond}>
            <SecondBrainEntryCard
              entry={sampleSecondBrainEntry}
              styles={secondBrainCardStyles}
              theme={theme}
              isBusy={false}
              isSwipeOpen={false}
              isDeleteConfirm={false}
              displayDate="Today · 3:50 PM"
              displayRemindAt=""
              onOpenEntry={() => {}}
              onCloseSwipe={() => {}}
              onStartEdit={() => {}}
              onToggleArchive={() => {}}
              onDownloadIcs={() => {}}
              onRequestDelete={() => {}}
            />
          </View>
        </View>
      </View>

      <View>
        <ProductCard
          number="01 / 02"
          tagline="Put your best thought forward"
          description="Find the best ideas in a world with minimal noise."
          features={openBrainFeatures}
          buttonLabel="Start sharing ideas"
          onPress={token ? () => navigation.navigate('OpenBrainFeed') : primaryAction}
          isOpenBrain
          compactLogo={compactLogo}
        />
      </View>
      <View>
        <ProductCard
          number="02 / 02"
          tagline="Half-baked / fully formed knowledge, organized and searchable"
          description="Your personal knowledge system. Everything you've learned, decided, and built - organized so you can actually find it later."
          features={secondBrainFeatures}
          buttonLabel="Build your knowledge base"
          onPress={token ? () => navigation.navigate('SecondBrain') : primaryAction}
          compactLogo={compactLogo}
        />
      </View>

      <View style={styles.workflowSection}>
        <Text style={styles.workflowLabel}>The workflow</Text>
        <Text style={styles.workflowTitle}>From raw spark to refined knowledge in four steps</Text>
        <View style={styles.stepGrid}>
          {workflowSteps.map(step => (
            <View key={step.num} style={styles.stepCard}>
              <Text style={styles.stepNum}>{step.num}</Text>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>
                {step.desc}
                {step.descSuffix ? <SecondBrainLogo style={styles.stepLogoInline} accentStyle={styles.stepLogoAccent} /> : null}
                {step.descSuffix || ''}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.ctaSection}>
        <View style={[styles.ctaBlock, styles.openCta]}>
          <Text style={styles.ctaTitle}>Think out loud with the world</Text>
          <Text style={styles.ctaBody}>
            Join thousands of people sharing their foremost ponderings every day on <OpenBrainLogo style={[styles.openBrainLogoText, styles.ctaLogoInline]} accentStyle={styles.openBrainLogoAccent} />.
          </Text>
          <Pressable style={[styles.ctaButtonLight, styles.openAccentBg]} onPress={token ? () => navigation.navigate('OpenBrainFeed') : primaryAction}>
            <Text style={styles.buttonLabelText}>Try Openbrain</Text>
          </Pressable>
        </View>

        <View style={[styles.ctaBlock, styles.secondCta]}>
          <Text style={styles.ctaTitle}>Build the brain you wish you had</Text>
          <Text style={styles.ctaBody}>
            Your notes, your insights, your decisions - all in one searchable, enduring archive with <SecondBrainLogo style={styles.ctaLogoInline} />.
          </Text>
          <Pressable style={[styles.ctaButtonLight, styles.secondAccentBg]} onPress={token ? () => navigation.navigate('SecondBrain') : primaryAction}>
            <Text style={styles.buttonLabelText}>Try SecondBrain</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © {currentYear} <OpenBrainLogo style={[styles.openBrainLogoText, styles.footerLogoInline]} accentStyle={styles.openBrainLogoAccent} /> & <SecondBrainLogo style={styles.footerLogoInline} />
        </Text>
      </View>
    </Animated.ScrollView>
  );
}
