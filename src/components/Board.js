// 15x15 棋盘：深色木质纹理 + 浅灰网格线 + 金色星位
import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Line, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

const SIZE = 15;
const BOARD_PX = 340;
const PADDING = 18;
const CELL = (BOARD_PX - PADDING * 2) / (SIZE - 1);
const STONE_R = CELL * 0.42;

// 五星位（标准棋盘标记点）
const STAR_POINTS = [
  [3, 3], [3, 11], [7, 7], [11, 3], [11, 11],
];

// 木纹装饰：几道浅色横线，模拟纹理
const WOOD_GRAINS = [
  { y: 0.18, opacity: 0.05 },
  { y: 0.34, opacity: 0.04 },
  { y: 0.55, opacity: 0.06 },
  { y: 0.72, opacity: 0.04 },
  { y: 0.88, opacity: 0.05 },
];

export default function Board({
  moves = [],
  lastMove = null,
  disabled = false,
  onPlace,
  size = BOARD_PX,
}) {
  const cell = (size - PADDING * 2) / (SIZE - 1);
  const stoneR = cell * 0.42;

  const placedMap = useMemo(() => {
    const m = {};
    for (const mv of moves) m[`${mv.x}_${mv.y}`] = mv.player;
    return m;
  }, [moves]);

  // 用 ref 拿到命中层的 DOM 节点，避免 web 上 e.target 在子 Svg 上的问题
  const containerRef = useRef(null);

  function handlePress(e) {
    if (disabled) return;
    let x, y;
    const t = e?.nativeEvent;
    // 路径 1: 移动端 RN 原生 locationX/Y
    if (t && typeof t.locationX === 'number' && typeof t.locationY === 'number') {
      x = t.locationX; y = t.locationY;
    }
    // 路径 2: web clientX/Y - getBoundingClientRect(Pressable 容器)
    if (x == null || y == null) {
      const rect = containerRef.current?.getBoundingClientRect?.();
      const cx = t?.clientX, cy = t?.clientY;
      const px = t?.pageX, py = t?.pageY;
      if (rect && (cx != null || px != null)) {
        x = (cx != null ? cx - rect.left : px - rect.left);
        y = (cy != null ? cy - rect.top : py - rect.top);
      }
    }
    // 路径 3: e.target / currentTarget 的 rect
    if (x == null || y == null) {
      const rect = e?.target?.getBoundingClientRect?.() || e?.currentTarget?.getBoundingClientRect?.();
      const cx = t?.clientX, cy = t?.clientY;
      if (rect && cx != null) {
        x = cx - rect.left; y = cy - rect.top;
      }
    }
    if (x == null || y == null) {
      console.log('[Board] click ignored, no coords', { t });
      return;
    }
    const gx = Math.round((x - PADDING) / cell);
    const gy = Math.round((y - PADDING) / cell);
    if (gx < 0 || gx >= SIZE || gy < 0 || gy >= SIZE) return;
    if (placedMap[`${gx}_${gy}`]) return;
    console.log('[Board] place', gx, gy, 'from', x, y);
    onPlace && onPlace(gx, gy);
  }

  // 网格
  const gridLines = [];
  for (let i = 0; i < SIZE; i++) {
    const p = PADDING + i * cell;
    const isEdge = i === 0 || i === SIZE - 1;
    gridLines.push(
      <Line key={`h${i}`} x1={PADDING} y1={p} x2={PADDING + (SIZE - 1) * cell} y2={p}
        stroke={colors.gridLine} strokeWidth={isEdge ? 1.6 : 0.9} opacity={isEdge ? 0.9 : 0.7} />
    );
    gridLines.push(
      <Line key={`v${i}`} x1={p} y1={PADDING} x2={p} y2={PADDING + (SIZE - 1) * cell}
        stroke={colors.gridLine} strokeWidth={isEdge ? 1.6 : 0.9} opacity={isEdge ? 0.9 : 0.7} />
    );
  }

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Pressable
        ref={containerRef}
        onPress={handlePress}
        style={[styles.board, { width: size, height: size }]}
      >
        <Svg width={size} height={size} pointerEvents="none">
          <Defs>
            <LinearGradient id="boardGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3a2114" />
              <Stop offset="1" stopColor="#1f1108" />
            </LinearGradient>
            <LinearGradient id="boardBorder" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.goldDeep} stopOpacity="0.7" />
              <Stop offset="1" stopColor={colors.gold} stopOpacity="0.4" />
            </LinearGradient>
          </Defs>

          {/* 边框（金色描边） */}
          <Rect x={1} y={1} width={size - 2} height={size - 2} rx={8} ry={8}
            fill="none" stroke="url(#boardBorder)" strokeWidth={2} />
          {/* 木纹底色 */}
          <Rect x={6} y={6} width={size - 12} height={size - 12} rx={6} ry={6}
            fill="url(#boardGrad)" />

          {/* 木纹装饰横线 */}
          {WOOD_GRAINS.map((g, i) => (
            <Line key={`grain${i}`}
              x1={6} y1={6 + g.y * (size - 12)}
              x2={size - 6} y2={6 + g.y * (size - 12)}
              stroke="#8a6a48" strokeWidth={1.2} opacity={g.opacity}
            />
          ))}

          {/* 网格 */}
          {gridLines}

          {/* 星位（小金点） */}
          {STAR_POINTS.map(([sx, sy], idx) => (
            <Circle key={`star${idx}`}
              cx={PADDING + sx * cell} cy={PADDING + sy * cell}
              r={3} fill={colors.starDot} opacity={0.95}
            />
          ))}

          {/* 棋子 */}
          {moves.map((m, idx) => {
            const cx = PADDING + m.x * cell;
            const cy = PADDING + m.y * cell;
            if (m.player === 'black') {
              return (
                <React.Fragment key={`s${idx}`}>
                  <Circle cx={cx + 1.2} cy={cy + 1.8} r={stoneR} fill="#000" opacity={0.45} />
                  <Circle cx={cx} cy={cy} r={stoneR}
                    fill={colors.stoneBlack}
                    stroke="#000" strokeWidth={0.8} />
                  <Circle cx={cx - stoneR * 0.32} cy={cy - stoneR * 0.32} r={stoneR * 0.28}
                    fill="#3a3a3a" opacity={0.9} />
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={`s${idx}`}>
                <Circle cx={cx + 1.2} cy={cy + 1.8} r={stoneR} fill="#000" opacity={0.5} />
                <Circle cx={cx} cy={cy} r={stoneR}
                  fill={colors.stoneWhite}
                  stroke={colors.stoneWhiteEdge} strokeWidth={1.2} />
                <Circle cx={cx - stoneR * 0.34} cy={cy - stoneR * 0.34} r={stoneR * 0.26}
                  fill="#ffffff" opacity={0.95} />
              </React.Fragment>
            );
          })}

          {/* 最后一手高亮：金色方框 */}
          {lastMove && (
            <Rect
              x={PADDING + lastMove.x * cell - 6}
              y={PADDING + lastMove.y * cell - 6}
              width={12} height={12}
              stroke={colors.goldBright} strokeWidth={1.8} fill="none"
            />
          )}
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
});
