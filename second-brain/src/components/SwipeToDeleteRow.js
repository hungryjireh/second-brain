import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, Text, View, PanResponder } from "react-native";

const SWIPE_OPEN_THRESHOLD = 44;
const FULL_LEFT_SWIPE_EPSILON = 4;
const FULL_SWIPE_DELETE_RATIO = 0.92;

export function isFullLeftSwipe(currentOffset, dx, actionWidth) {
  return currentOffset + dx <= -actionWidth + FULL_LEFT_SWIPE_EPSILON;
}

export default function SwipeToDeleteRow({
  id,
  onOpen,
  isOpen,
  isRaised,
  actionLabel,
  onActionPress,
  actionWidth,
  styles,
  children,
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const currentOffsetRef = useRef(0);
  const [rowWidth, setRowWidth] = useState(actionWidth);
  const maxSwipeDistance = Math.max(actionWidth, rowWidth);

  const animateTo = useCallback(
    (value, immediate = false) => {
      currentOffsetRef.current = value;
      if (immediate) {
        translateX.setValue(value);
        return;
      }
      Animated.spring(translateX, {
        toValue: value,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }).start();
    },
    [translateX],
  );

  useEffect(() => {
    animateTo(isOpen ? -actionWidth : 0);
  }, [actionWidth, animateTo, isOpen]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const horizontalMove =
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          return (
            horizontalMove &&
            (gestureState.dx < -8 || (isOpen && gestureState.dx > 8))
          );
        },
        onPanResponderMove: (_, gestureState) => {
          const next = Math.max(
            -maxSwipeDistance,
            Math.min(0, currentOffsetRef.current + gestureState.dx),
          );
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gestureState) => {
          const didFullySwipeLeft = isFullLeftSwipe(
            currentOffsetRef.current,
            gestureState.dx,
            maxSwipeDistance * FULL_SWIPE_DELETE_RATIO,
          );
          if (didFullySwipeLeft) {
            animateTo(-maxSwipeDistance, true);
            onOpen(id);
            onActionPress?.();
            return;
          }
          const shouldOpen =
            gestureState.dx < -SWIPE_OPEN_THRESHOLD ||
            (isOpen && gestureState.dx < SWIPE_OPEN_THRESHOLD);
          if (shouldOpen) onOpen(id);
          else animateTo(0);
        },
        onPanResponderTerminate: () => {
          animateTo(isOpen ? -actionWidth : 0);
        },
      }),
    [
      animateTo,
      id,
      isOpen,
      maxSwipeDistance,
      onActionPress,
      onOpen,
      translateX,
    ],
  );

  return (
    <View
      style={[styles.swipeRow, isRaised ? styles.swipeRowRaised : null]}
      onLayout={(event) => {
        const nextWidth = event?.nativeEvent?.layout?.width;
        if (!nextWidth) return;
        setRowWidth(nextWidth);
      }}
    >
      <View style={styles.swipeActionWrap}>
        <Pressable
          testID={`entry-swipe-delete-${id}`}
          style={styles.swipeDeleteAction}
          onPress={onActionPress}
        >
          <Text style={styles.swipeDeleteText}>{actionLabel}</Text>
        </Pressable>
      </View>
      <Animated.View
        testID={`entry-swipe-card-${id}`}
        style={[styles.swipeCardWrap, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}
