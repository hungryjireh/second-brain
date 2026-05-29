import { Animated, Pressable, Text, View } from "react-native";
import { useEffect, useRef } from "react";
import { Feather } from "@expo/vector-icons";
import styles from "./SecondBrainVoiceCaptureLayout.styles";

export default function SecondBrainVoiceCaptureLayout({
  insetsTop = 0,
  screenTitle,
  heading,
  description,
  onBackPress,
  children,
  bodyStyle,
  headingStyle,
  descriptionStyle,
  transcriptText,
  hideIntro = false,
}) {
  const hasTranscript = Boolean(String(transcriptText || "").trim());
  const shouldHideIntro = hasTranscript || hideIntro;
  const introOpacity = useRef(new Animated.Value(1)).current;
  const transcriptOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(introOpacity, {
        toValue: shouldHideIntro ? 0 : 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(transcriptOpacity, {
        toValue: hasTranscript ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [hasTranscript, shouldHideIntro, introOpacity, transcriptOpacity]);

  return (
    <View style={styles.container}>
      <View style={[styles.topRow, { marginTop: Math.max(insetsTop, 8) + 4 }]}>
        <Pressable
          style={styles.backButton}
          onPress={onBackPress}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={28} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.title}>{screenTitle}</Text>
      </View>

      <View style={[styles.body, bodyStyle]}>
        <Animated.View
          style={[
            styles.introWrap,
            shouldHideIntro ? styles.introWrapHidden : null,
            { opacity: introOpacity },
          ]}
          pointerEvents={shouldHideIntro ? "none" : "auto"}
        >
          {heading ? (
            <Text style={[styles.heading, headingStyle]}>{heading}</Text>
          ) : null}
          {description ? (
            <Text style={[styles.subtitle, descriptionStyle]}>
              {description}
            </Text>
          ) : null}
        </Animated.View>
        <Animated.View
          style={[styles.transcriptWrap, { opacity: transcriptOpacity }]}
          pointerEvents="none"
        >
          {hasTranscript ? (
            <Text style={styles.transcriptText}>{transcriptText}</Text>
          ) : null}
        </Animated.View>
        {children}
      </View>
    </View>
  );
}
