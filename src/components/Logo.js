// 游戏 Logo：五颗星呈梅花/五角分布 + 标题
// 使用纯 SVG，颜色走琥珀金主调
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors, fontSize, fontWeight } from '../theme';

const STAR_POSITIONS = [
  // 五点梅：上、右上、右下、左下、左上（相对坐标 0..1）
  { cx: 30, cy: 8 },   // 上
  { cx: 48, cy: 22 },  // 右上
  { cx: 40, cy: 44 },  // 右下
  { cx: 20, cy: 44 },  // 左下
  { cx: 12, cy: 22 },  // 左上
];
// 五条连线（构成五角星形）
const STAR_LINES = [
  [0, 2], [0, 3], [1, 3], [1, 4], [2, 4],
];

export default function Logo({ size = 96, showTitle = true, title = '五星连珠' }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.logoBox, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 60 60">
          <Circle cx="30" cy="30" r="29" fill="none" stroke={colors.gold} strokeWidth="1" opacity={0.5} />
          {STAR_LINES.map(([a, b], i) => (
            <Line
              key={i}
              x1={STAR_POSITIONS[a].cx}
              y1={STAR_POSITIONS[a].cy}
              x2={STAR_POSITIONS[b].cx}
              y2={STAR_POSITIONS[b].cy}
              stroke={colors.gold}
              strokeWidth="0.6"
              opacity={0.55}
            />
          ))}
          {STAR_POSITIONS.map((p, i) => (
            <Circle
              key={i}
              cx={p.cx}
              cy={p.cy}
              r={i === 0 ? 2.6 : 2.0}
              fill={i === 0 ? colors.goldBright : colors.gold}
            />
          ))}
        </Svg>
      </View>
      {showTitle && (
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>FIVE  IN  A  ROW</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  logoBox: { alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    color: colors.gold,
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: fontSize.tiny,
    color: colors.textMuted,
    letterSpacing: 4,
    marginTop: 4,
  },
});
