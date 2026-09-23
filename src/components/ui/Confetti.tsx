import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

const COLORS = ['#F4C542', '#159447', '#8B7BE8', '#E53935', '#2563EB', '#DB2777'];
const PIECE_COUNT = 24;
const FALL_MS = 1400;

interface Piece {
  key: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  drift: number;
  spin: number;
}

/**
 * A short burst of paper confetti.
 *
 * Built on React Native's own `Animated` rather than a library: it is a couple
 * of dozen views on a timer, and `useNativeDriver` keeps the whole thing off
 * the JS thread. Honours the OS reduce-motion setting, where a shower of
 * moving paper is exactly what the user has asked not to see.
 */
export function Confetti({ run, onDone }: { run: boolean; onDone?: () => void }) {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        key: i,
        x: Math.random() * width,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 5,
        delay: Math.random() * 350,
        drift: (Math.random() - 0.5) * 120,
        spin: 180 + Math.random() * 540,
      })),
    [width],
  );

  useEffect(() => {
    if (!run || reduceMotion) {
      if (run && reduceMotion) onDone?.();
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: FALL_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone?.();
    });
  }, [run, reduceMotion, progress, onDone]);

  if (!run || reduceMotion) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece) => {
        // Each piece starts after its own delay, so the burst staggers rather
        // than dropping as one sheet.
        const start = piece.delay / FALL_MS;
        const range = [0, start, 1];

        return (
          <Animated.View
            key={piece.key}
            style={{
              position: 'absolute',
              top: -20,
              left: piece.x,
              width: piece.size,
              height: piece.size * 1.6,
              backgroundColor: piece.color,
              borderRadius: 1,
              opacity: progress.interpolate({
                inputRange: [0, start, 0.85, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: range,
                    outputRange: [0, 0, 520],
                  }),
                },
                {
                  translateX: progress.interpolate({
                    inputRange: range,
                    outputRange: [0, 0, piece.drift],
                  }),
                },
                {
                  rotate: progress.interpolate({
                    inputRange: range,
                    outputRange: ['0deg', '0deg', `${piece.spin}deg`],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
