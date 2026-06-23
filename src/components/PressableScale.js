// 带按下缩放反馈的可点击容器
// 使用 Animated.spring 模拟 0.95 缩放
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

export default function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  wrapStyle, // 覆盖外层 Pressable 自身的盒子样式（默认不强制 width,让父级 flex 决定）
  scaleTo = 0.95,
  activeOpacity = 1,
  hitSlop,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  }
  function pressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      // 把调用方传入的 style 当作外层 Pressable 自身的样式,这样 flex 容器能直接识别
      style={wrapStyle || [styles.touch, style]}
    >
      <Animated.View
        // 内层只做缩放,宽度跟随外层 Pressable
        style={[styles.inner, { transform: [{ scale }], opacity: disabled ? 0.45 : 1 }]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 默认外层 Pressable 样式:不做任何 width/height 限制,让父级 flex 布局决定
  touch: {},
  // 内层宽度跟随外层
  inner: { width: '100%', alignItems: 'center', justifyContent: 'center' },
});
