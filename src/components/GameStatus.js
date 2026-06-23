// 对局状态条：双方昵称 + 棋子图标 + 回合提示 + 悔棋次数
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, fontSize, fontWeight, spacing } from '../theme';

export default function GameStatus({
  myColor,
  currentTurn,
  blackName,
  whiteName,
  undoBlack = 3,
  undoWhite = 3,
  status,
  resultText,
}) {
  const isPlaying = status === 'playing';
  const myTurn = isPlaying && myColor && currentTurn === myColor;
  const turnLabel = currentTurn === 'black' ? '黑方落子' : '白方落子';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <PlayerCard
          name={blackName || '黑方'}
          color="black"
          active={currentTurn === 'black' && isPlaying}
          you={myColor === 'black'}
          undoLeft={undoBlack}
        />
        <View style={styles.center}>
          {!isPlaying ? (
            <Text style={[styles.turnText, { color: colors.gold }]}>{resultText || '对局结束'}</Text>
          ) : (
            <Text style={[styles.turnText, { color: myTurn ? colors.success : colors.textMuted }]}>
              {myTurn ? '★ 轮到你了' : `… ${turnLabel} 中`}
            </Text>
          )}
          <Text style={styles.turnSub}>{isPlaying ? '点击棋盘交叉点落子' : ''}</Text>
        </View>
        <PlayerCard
          name={whiteName || '白方'}
          color="white"
          active={currentTurn === 'white' && isPlaying}
          you={myColor === 'white'}
          undoLeft={undoWhite}
        />
      </View>
    </View>
  );
}

function PlayerCard({ name, color, active, you, undoLeft }) {
  return (
    <View style={[styles.player, active && styles.playerActive]}>
      <View style={[styles.stone, color === 'black' ? styles.stoneBlack : styles.stoneWhite]} />
      <View style={{ flex: 1, marginLeft: 6 }}>
        <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>
          {name}{you ? ' (你)' : ''}
        </Text>
        <Text style={styles.undo}>悔棋 × {undoLeft}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldDeep,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  player: {
    flex: 2.4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  playerActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(212, 165, 116, 0.12)',
  },
  stone: {
    width: 18, height: 18, borderRadius: 9,
  },
  stoneBlack: { backgroundColor: colors.stoneBlack, borderWidth: 1, borderColor: '#000' },
  stoneWhite: { backgroundColor: colors.stoneWhite, borderWidth: 1, borderColor: colors.stoneWhiteEdge },
  name: { fontSize: fontSize.small, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  nameActive: { color: colors.gold },
  undo: { fontSize: fontSize.tiny, color: colors.textMuted, marginTop: 2 },
  center: { flex: 3, alignItems: 'center', paddingHorizontal: 4 },
  turnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: 1 },
  turnSub: { fontSize: fontSize.tiny, color: colors.textMuted, marginTop: 2 },
});
