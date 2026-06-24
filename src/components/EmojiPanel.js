// 表情包面板 + 飘浮动画
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { colors, radius, spacing } from '../theme';

const EMOJIS = [
  '😊', '😂', '😎', '😡', '😢', '😱', '👍', '👎', '👏', '🙏',
  '💪', '🔥', '⭐', '❤️', '💔', '🎉', '🤔', '😴', '🥳', '🤬',
];

export default function EmojiPanel({ onEmoji, visible }) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {EMOJIS.map((emoji, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onEmoji(emoji)}
            style={styles.emojiBtn}
            activeOpacity={0.6}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// 飘浮表情动画
function FloatingEmoji({ emoji, onDone }) {
  const anim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const xOffset = useRef((Math.random() - 0.5) * 80).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1800,
        useNativeDriver: true,
      }),
    ]).start(() => onDone && onDone());
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -120],
  });

  return (
    <Animated.View
      style={[
        styles.floating,
        {
          transform: [{ translateY }, { translateX: xOffset }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.floatingEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

// 表情飘浮层
export function EmojiReactionLayer({ reactions }) {
  return (
    <View style={styles.floatingLayer} pointerEvents="none">
      {reactions.map((r) => (
        <FloatingEmoji key={r.id} emoji={r.emoji} onDone={r.onDone} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginHorizontal: spacing.md,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emojiBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm,
    margin: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emojiText: {
    fontSize: 20,
  },
  floatingLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  floating: {
    position: 'absolute',
    top: '50%',
  },
  floatingEmoji: {
    fontSize: 36,
  },
});