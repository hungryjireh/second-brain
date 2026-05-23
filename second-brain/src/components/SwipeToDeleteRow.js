import { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, Text, View, PanResponder } from "react-native";

const SWIPE_OPEN_THRESHOLD = 44;
const FULL_LEFT_SWIPE_EPSILON = 4;
const FULL_SWIPE_DELETE_RATIO = 0.92;
const MIN_HORIZONTAL_SWIPE_DISTANCE = 8;
const MAX_VERTICAL_DRIFT_FOR_SWIPE = 16;
const HORIZONTAL_INTENT_RATIO = 1.15;

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
  onSwipeGestureStart,
  onSwipeGestureEnd,
  styles,
  children,
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const currentOffsetRef = useRef(0);
  const maxSwipeDistance = actionWidth;

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
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          const horizontalDistance = Math.abs(gestureState.dx);
          const verticalDistance = Math.abs(gestureState.dy);
          const isHorizontalIntent =
            horizontalDistance >= MIN_HORIZONTAL_SWIPE_DISTANCE &&
            verticalDistance <= MAX_VERTICAL_DRIFT_FOR_SWIPE &&
            horizontalDistance > verticalDistance * HORIZONTAL_INTENT_RATIO;
          return (
            isHorizontalIntent &&
            (gestureState.dx < -4 || (isOpen && gestureState.dx > 4))
          );
        },
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const horizontalDistance = Math.abs(gestureState.dx);
          const verticalDistance = Math.abs(gestureState.dy);
          const horizontalMove =
            horizontalDistance >= MIN_HORIZONTAL_SWIPE_DISTANCE &&
            verticalDistance <= MAX_VERTICAL_DRIFT_FOR_SWIPE &&
            horizontalDistance > verticalDistance * HORIZONTAL_INTENT_RATIO;
          return (
            horizontalMove &&
            (gestureState.dx < -4 || (isOpen && gestureState.dx > 4))
          );
        },
        onPanResponderMove: (_, gestureState) => {
          const next = Math.max(
            -maxSwipeDistance,
            Math.min(0, currentOffsetRef.current + gestureState.dx),
          );
          translateX.setValue(next);
        },
        onPanResponderGrant: () => {
          onSwipeGestureStart?.();
        },
        onPanResponderRelease: (_, gestureState) => {
          onSwipeGestureEnd?.();
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
          if (shouldOpen) {
            animateTo(-actionWidth);
            onOpen(id);
          } else animateTo(0);
        },
        onPanResponderTerminate: () => {
          onSwipeGestureEnd?.();
          animateTo(isOpen ? -actionWidth : 0);
        },
      }),
    [
      animateTo,
      id,
      isOpen,
      maxSwipeDistance,
      actionWidth,
      onActionPress,
      onOpen,
      onSwipeGestureEnd,
      onSwipeGestureStart,
      translateX,
    ],
  );

  return (
    <View style={[styles.swipeRow, isRaised ? styles.swipeRowRaised : null]}>
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
