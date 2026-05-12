import { ScrollView, Text, View, Pressable } from 'react-native';
import styles from './HomeScreenStyles';
import OpenBrainThoughtCard from '../components/OpenBrainThoughtCard';
import SecondBrainEntryCard from '../components/SecondBrainEntryCard';
import { theme } from '../theme';
import secondBrainCardStyles from './SecondBrainScreen.styles';

const openBrainFeatures = [
  'Publish short thoughts with tags and rich context - no friction, no drafts',
  'Discover ideas through a live feed and powerful search by topic or person',
  'View profiles and follow the people whose thinking you want more of',
];

const secondBrainFeatures = [
  'Capture notes and insights in one consistent system - no more scattered docs',
  'Organize entries so your knowledge stays searchable across years of work',
  'Maintain a personal archive for projects, decisions, and what you learned',
];

const workflowSteps = [
  {
    num: 'STEP 01',
    title: 'Spark a thought',
    desc: 'Post a rough idea on OpenBrain while it is still fresh.',
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
    desc: 'Move the best ideas into SecondBrain with context attached.',
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
  title: 'Saved from OpenBrain',
  summary: 'Inverted onboarding: map outcomes first, then guide user setup by intent.',
  raw_text: 'Inverted onboarding: map outcomes first, then guide user setup by intent.',
  is_archived: false,
  remind_at: null,
  tags: ['product', 'decisionlog'],
};

function ProductCard({ number, title, tagline, description, features, buttonLabel, onPress, isOpenBrain }) {
  const [firstWord, secondWord] = title.split(' ');

  return (
    <View style={styles.productCard}>
      <Text style={styles.productNumber}>{number}</Text>
      <View style={styles.productTitleWrap}>
        <Text style={[styles.productTitleScript, isOpenBrain ? styles.openAccentText : styles.secondAccentText]}>{firstWord}</Text>
        <Text style={[styles.productTitleScript, isOpenBrain ? styles.openAccentText : styles.secondAccentText]}>{secondWord}</Text>
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

export default function HomeScreen({ navigation, token }) {
  const primaryAction = token ? () => navigation.navigate('Apps') : () => navigation.navigate('Login');
  const currentYear = new Date().getFullYear();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>Think faster. Build better.</Text>
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
          OpenBrain lets you share thoughts in real time. SecondBrain turns them into lasting knowledge. Together, they close the loop between inspiration and clarity.
        </Text>
        <View style={styles.heroActions}>
          <Pressable style={[styles.heroButton, styles.openButton]} onPress={token ? () => navigation.navigate('OpenBrainFeed') : primaryAction}>
            <Text style={styles.buttonLabelText}>Try OpenBrain</Text>
          </Pressable>
          <Pressable style={[styles.heroButton, styles.secondButton]} onPress={token ? () => navigation.navigate('SecondBrain') : primaryAction}>
            <Text style={styles.buttonLabelText}>Try SecondBrain</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.previewWrap}>
        <View style={styles.previewPanelTop}>
          <Text style={styles.previewBadgeOpen}>OpenBrain live feed</Text>
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
          <Text style={styles.previewBadgeSecond}>SecondBrain archive</Text>
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

      <View style={styles.productsSection}>
        <ProductCard
          number="01 / 02"
          title="OpenBrain"
          tagline="Social thinking for fast feedback"
          description="Capture the half-formed idea before it escapes. Share it with a community of builders and thinkers who will push it further."
          features={openBrainFeatures}
          buttonLabel="Start sharing ideas"
          onPress={token ? () => navigation.navigate('OpenBrainFeed') : primaryAction}
          isOpenBrain
        />
        <ProductCard
          number="02 / 02"
          title="SecondBrain"
          tagline="Private workspace for long-term clarity"
          description="Your personal knowledge system. Everything you've learned, decided, and built - organized so you can actually find it later."
          features={secondBrainFeatures}
          buttonLabel="Build your knowledge base"
          onPress={token ? () => navigation.navigate('SecondBrain') : primaryAction}
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
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.ctaSection}>
        <View style={[styles.ctaBlock, styles.openCta]}>
          <Text style={styles.ctaTitle}>Think out loud with the world</Text>
          <Text style={styles.ctaBody}>Join thousands of builders sharing their best half-baked ideas every day on OpenBrain.</Text>
          <Pressable style={[styles.ctaButtonLight, styles.openAccentBg]} onPress={token ? () => navigation.navigate('OpenBrainFeed') : primaryAction}>
            <Text style={styles.buttonLabelText}>Try OpenBrain</Text>
          </Pressable>
        </View>

        <View style={[styles.ctaBlock, styles.secondCta]}>
          <Text style={styles.ctaTitle}>Build the brain you always wanted</Text>
          <Text style={styles.ctaBody}>Your notes, your insights, your decisions - all in one searchable, enduring archive with SecondBrain.</Text>
          <Pressable style={[styles.ctaButtonLight, styles.secondAccentBg]} onPress={token ? () => navigation.navigate('SecondBrain') : primaryAction}>
            <Text style={styles.buttonLabelText}>Try SecondBrain</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© {currentYear} OpenBrain & SecondBrain</Text>
      </View>
    </ScrollView>
  );
}
