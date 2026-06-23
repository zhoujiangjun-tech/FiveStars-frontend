// 对局回放 —— 不可点击的棋盘 + 播放/暂停 + 步数滑块 + 步数条
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Board from '../components/Board';
import PressableScale from '../components/PressableScale';
import { colors, radius, fontSize, fontWeight, spacing } from '../theme';
import { api } from '../services/api';

// 用 View 模拟滑动条（不依赖额外原生包）
function StepSlider({ value, max, onChange }) {
  const [width, setWidth] = useState(0);
  const pct = max > 0 ? value / max : 0;
  return (
    <View
      style={styles.sliderWrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderRelease={(e) => {
        if (width === 0 || max === 0) return;
        const x = e.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / width));
        onChange(Math.round(ratio * max));
      }}
    >
      <View style={styles.sliderTrack} />
      <View style={[styles.sliderFill, { width: `${pct * 100}%` }]} />
      <View style={[styles.sliderThumb, { left: `${pct * 100}%` }]} />
    </View>
  );
}

export default function ReplayScreen({ route, navigation }) {
  const { gameId } = route.params;
  const [game, setGame] = useState(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.gameDetail(gameId);
        setGame(data);
        setStep(data.moveHistory.length);
      } catch (e) {
        console.warn('加载对局失败：', e.message);
      }
    })();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameId]);

  useEffect(() => {
    if (playing && game) {
      timerRef.current = setInterval(() => {
        setStep((prev) => {
          if (prev >= game.moveHistory.length) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, game]);

  if (!game) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loading}>加载中…</Text>
      </View>
    );
  }

  const total = game.moveHistory.length;
  const moves = game.moveHistory.slice(0, step).map((m) => ({
    x: m.x, y: m.y, player: m.player,
  }));
  const last = moves.length ? moves[moves.length - 1] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>黑：{game.black?.username}</Text>
          <Text style={styles.title}>白：{game.white?.username}</Text>
        </View>
        <View style={styles.statusChip}>
          <Ionicons
            name={game.status === 'finished' ? 'flag' : game.status === 'draw' ? 'remove-circle' : 'play'}
            size={14}
            color={colors.gold}
          />
          <Text style={styles.statusText}>
            {game.status === 'finished' ? '已结束' : game.status === 'draw' ? '平局' : '进行中'}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
        <Board moves={moves} lastMove={last} disabled />
      </View>

      {/* 步数显示 + 滑块 */}
      <View style={styles.controls}>
        <Text style={styles.stepText}>
          第 <Text style={{ color: colors.gold }}>{step}</Text> 步 / 共 {total} 步
        </Text>
        <StepSlider value={step} max={total} onChange={setStep} />
      </View>

      {/* 播放控制 */}
      <View style={styles.playerBar}>
        <PressableScale onPress={() => setStep(0)} style={styles.iconBtn}>
          <Ionicons name="play-skip-back" size={22} color={colors.gold} />
        </PressableScale>
        <PressableScale
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          style={styles.iconBtn}
        >
          <Ionicons name="play-back" size={22} color={colors.gold} />
        </PressableScale>
        <PressableScale
          onPress={() => setPlaying((p) => !p)}
          style={[styles.iconBtn, styles.playBtn]}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={28} color={colors.textOnGold} />
        </PressableScale>
        <PressableScale
          onPress={() => setStep((s) => Math.min(total, s + 1))}
          style={styles.iconBtn}
        >
          <Ionicons name="play-forward" size={22} color={colors.gold} />
        </PressableScale>
        <PressableScale onPress={() => setStep(total)} style={styles.iconBtn}>
          <Ionicons name="play-skip-forward" size={22} color={colors.gold} />
        </PressableScale>
      </View>

      {/* 落子列表 */}
      <ScrollView style={styles.moveList}>
        {game.moveHistory.map((m, idx) => (
          <View
            key={idx}
            style={[
              styles.moveItem,
              idx + 1 === step && styles.moveItemActive,
            ]}
          >
            <Text style={styles.moveIdx}>{idx + 1}</Text>
            <View style={[styles.stone, m.player === 'black' ? styles.stoneBlack : styles.stoneWhite]} />
            <Text style={styles.moveText}>
              {m.player === 'black' ? '黑' : '白'} · ({m.x}, {m.y})
            </Text>
            <Text style={styles.moveTime}>{new Date(m.timestamp).toLocaleTimeString()}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, padding: spacing.md, paddingTop: spacing.sm, width: '100%', maxWidth: 520, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgDeep },
  loading: { color: colors.textMuted, marginTop: spacing.md },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bgCard, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldDeep, marginBottom: spacing.sm,
  },
  title: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: fontWeight.semibold, letterSpacing: 1 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(212,165,116,0.12)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.goldDeep,
  },
  statusText: { color: colors.gold, fontSize: fontSize.tiny, marginLeft: 4, fontWeight: fontWeight.semibold },

  controls: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  stepText: { color: colors.textSecondary, fontSize: fontSize.small, textAlign: 'center', marginBottom: 6, letterSpacing: 2 },

  sliderWrap: { height: 30, justifyContent: 'center' },
  sliderTrack: { height: 4, backgroundColor: colors.bgElev, borderRadius: 2 },
  sliderFill: { position: 'absolute', height: 4, backgroundColor: colors.gold, borderRadius: 2, left: 0 },
  sliderThumb: {
    position: 'absolute', width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.goldBright, marginLeft: -9,
    top: 6, borderWidth: 2, borderColor: colors.bgDeep,
    shadowColor: colors.gold, shadowOpacity: 0.6, shadowOffset: { width: 0, height: 0 }, shadowRadius: 6, elevation: 4,
  },

  playerBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: spacing.md, paddingHorizontal: spacing.md },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.goldDeep,
  },
  playBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.gold, borderColor: colors.goldBright,
  },

  moveList: { flex: 1, marginTop: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 6, borderWidth: 1, borderColor: colors.goldDeep },
  moveItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  moveItemActive: { backgroundColor: 'rgba(212,165,116,0.18)' },
  moveIdx: { color: colors.gold, fontWeight: fontWeight.bold, width: 28, textAlign: 'center' },
  stone: { width: 12, height: 12, borderRadius: 6, marginHorizontal: 8 },
  stoneBlack: { backgroundColor: colors.stoneBlack, borderWidth: 1, borderColor: '#000' },
  stoneWhite: { backgroundColor: colors.stoneWhite, borderWidth: 1, borderColor: colors.stoneWhiteEdge },
  moveText: { color: colors.textPrimary, fontSize: fontSize.small, flex: 1 },
  moveTime: { color: colors.textMuted, fontSize: fontSize.tiny },
});
