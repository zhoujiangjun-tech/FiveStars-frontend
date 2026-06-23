// 对局结束结果弹窗 —— 大气竖排布局,内嵌"再来一局"邀请交互
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Animated, Easing, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fontSize, fontWeight, spacing } from '../theme';
import PressableScale from './PressableScale';

const { width: SCREEN_W } = Dimensions.get('window');

function FloatingStar({ delay, startX, duration, size, color, drift }) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(y, {
          toValue: -260,
          duration,
          delay,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 200, delay, useNativeDriver: true }),
          Animated.delay(duration - 600),
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.timing(rot, {
          toValue: 1,
          duration: duration * 1.2,
          delay,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
      ])
    ).start();
  }, []);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: startX,
        bottom: 20,
        fontSize: size,
        color,
        opacity,
        transform: [{ translateY: y }, { translateX: drift }, { rotate }],
      }}
    >
      ✦
    </Animated.Text>
  );
}

export default function ResultModal({
  visible,
  isWin,
  reason, // 'five_in_row' | 'resign' | 'exit' | 'timeout_2x'
  onHome,
  onReplay,
  // 主动方相关(胜利方 / 任意一方点"邀请再来一局"的一边)
  onRequestRematch, // 发送再来一局邀请
  rematchSent,      // boolean: 我方已发出邀请
  rematchDeclined,  // boolean: 对方拒绝了
  // 被动方相关(被邀请的一边)
  rematchIncoming,  // object: { fromId, fromUsername, gameId } 对方邀请
  onAcceptRematch,
  onDeclineRematch,
}) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.6);
      opacity.setValue(0);
    }
  }, [visible]);

  const title = isWin ? '你  赢  了' : '你  输  了';
  const sub =
    reason === 'resign'
      ? isWin ? '对手认输' : '你已认输'
      : reason === 'exit'
        ? isWin ? '对手退出了对局' : '你已退出对局'
        : reason === 'timeout_2x'
          ? isWin ? '对手思考超时 2 次,系统判你赢' : '你已思考超时 2 次,系统判负'
          : reason === 'five_in_row'
            ? isWin ? '五子连珠,势不可挡' : '差一步,再来一局'
            : '对局结束';

  const accent = isWin ? colors.gold : colors.danger;
  const stars = Array.from({ length: 14 }).map((_, i) => ({
    delay: i * 220,
    startX: (SCREEN_W / 14) * i + 12,
    duration: 2400 + (i % 5) * 200,
    size: 14 + (i % 3) * 4,
    color: i % 3 === 0 ? colors.goldBright : colors.gold,
    drift: (i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 6),
  }));

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onHome}>
      <View style={styles.backdrop}>
        {isWin && stars.map((s, i) => (
          <FloatingStar key={i} {...s} />
        ))}

        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>

          {/* 顶部图标 + 标题 */}
          <View style={styles.headerArea}>
            <View style={[styles.iconRing, { borderColor: accent }]}>
              <Ionicons name={isWin ? 'trophy' : 'sad-outline'} size={40} color={accent} />
            </View>
            <Text style={[styles.title, { color: accent }]}>{title}</Text>
            <Text style={styles.sub}>{sub}</Text>
            <View style={styles.divider} />
          </View>

          {/* 中部邀请区:有人邀请时优先显示 */}
          {rematchIncoming ? (
            <View style={styles.inviteBlock}>
              <View style={styles.inviteHeader}>
                <Ionicons name="mail-unread" size={20} color={colors.gold} />
                <Text style={styles.inviteHeaderText}>对 战 邀 请</Text>
              </View>
              <Text style={styles.inviteBody}>
                {rematchIncoming.fromUsername || '对手'} 邀请你<Text style={{ color: colors.goldBright, fontWeight: fontWeight.bold }}> 再 来 一 局 </Text>
                {'\n'}
                <Text style={styles.inviteHint}>(10 秒内未响应将自动取消)</Text>
              </Text>
              <View style={styles.inviteActions}>
                <PressableScale
                  onPress={onDeclineRematch}
                  style={styles.inviteRejectBtn}
                  wrapStyle={{ flex: 1, marginRight: 8 }}
                >
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                  <Text style={styles.inviteRejectText}>拒 绝</Text>
                </PressableScale>
                <PressableScale
                  onPress={onAcceptRematch}
                  style={styles.inviteAcceptBtn}
                  wrapStyle={{ flex: 1, marginLeft: 8 }}
                >
                  <Ionicons name="checkmark" size={18} color={colors.textOnGold} />
                  <Text style={styles.inviteAcceptText}>接 受 对 弈</Text>
                </PressableScale>
              </View>
            </View>
          ) : rematchDeclined ? (
            <View style={styles.declinedHint}>
              <Ionicons name="close-circle" size={16} color={colors.danger} />
              <Text style={styles.declinedText}>对手拒绝了再来一局</Text>
            </View>
          ) : rematchSent ? (
            <View style={styles.waitingHint}>
              <Ionicons name="hourglass-outline" size={16} color={colors.gold} />
              <Text style={styles.waitingText}>已发送再来一局邀请,等待对方接受…</Text>
            </View>
          ) : (
            <View style={styles.tipBlock}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={styles.tipText}>对局已结束,可邀请对方再来一局</Text>
            </View>
          )}

          {/* 底部按钮:返回大厅 / 回放 / 邀请对方再来一局(主动方) */}
          <View style={styles.actions}>
            <PressableScale onPress={onHome} style={styles.secondaryBtn} wrapStyle={{ flex: 1, marginRight: 6 }}>
              <Ionicons name="home-outline" size={16} color={colors.textMuted} />
              <Text style={styles.secondaryText}>返回大厅</Text>
            </PressableScale>
            <PressableScale
              onPress={onReplay}
              style={styles.thirdBtn}
              wrapStyle={{ flex: 1, marginHorizontal: 6 }}
            >
              <Ionicons name="film-outline" size={16} color={colors.gold} />
              <Text style={styles.thirdText}>回放</Text>
            </PressableScale>
            <PressableScale
              onPress={onRequestRematch}
              disabled={!!rematchSent || !!rematchIncoming}
              style={[
                styles.primaryBtn,
                (rematchSent || rematchIncoming) && { opacity: 0.4 },
              ]}
              wrapStyle={{ flex: 1.3, marginLeft: 6 }}
            >
              <Ionicons name="refresh" size={16} color={colors.textOnGold} />
              <Text style={styles.primaryText}>{rematchSent ? '已邀请' : rematchIncoming ? '对方邀请中' : '邀请对方'}</Text>
            </PressableScale>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 20, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '88%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldDeep,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerArea: { alignItems: 'center', paddingTop: spacing.xs },
  iconRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2,
    backgroundColor: 'rgba(212,165,116,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: fontWeight.heavy,
    letterSpacing: 8,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    marginTop: 6,
    letterSpacing: 2,
    textAlign: 'center',
  },
  divider: {
    width: 80,
    height: 2,
    backgroundColor: colors.goldDeep,
    marginTop: spacing.md,
    borderRadius: 1,
  },

  // 提示块
  tipBlock: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  tipText: { color: colors.textMuted, fontSize: 12, marginLeft: 6, letterSpacing: 1 },

  // 等待/拒绝提示
  waitingHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.md, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: 'rgba(212,165,116,0.08)', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldDeep,
  },
  waitingText: { color: colors.gold, fontSize: 13, marginLeft: 6, letterSpacing: 1 },
  declinedHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.md, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: 'rgba(255,107,107,0.08)', borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.4)',
  },
  declinedText: { color: colors.danger, fontSize: 13, marginLeft: 6, letterSpacing: 1 },

  // 邀请块
  inviteBlock: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(212,165,116,0.06)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  inviteHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  inviteHeaderText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: fontWeight.bold,
    letterSpacing: 3,
    marginLeft: 6,
  },
  inviteBody: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
    letterSpacing: 1,
  },
  inviteHint: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  inviteRejectBtn: {
    paddingVertical: 11, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  inviteRejectText: {
    color: colors.textMuted, fontSize: 14,
    fontWeight: fontWeight.semibold, letterSpacing: 2, marginLeft: 4,
  },
  inviteAcceptBtn: {
    paddingVertical: 11, borderRadius: radius.md,
    backgroundColor: colors.gold,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  inviteAcceptText: {
    color: colors.textOnGold, fontSize: 14,
    fontWeight: fontWeight.bold, letterSpacing: 2, marginLeft: 4,
  },

  // 底部按钮
  actions: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  primaryBtn: {
    paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: colors.gold,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  primaryText: {
    color: colors.textOnGold, fontSize: 14,
    fontWeight: fontWeight.bold, letterSpacing: 2, marginLeft: 4,
  },
  thirdBtn: {
    paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldDeep,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  thirdText: { color: colors.gold, fontSize: 14, fontWeight: fontWeight.semibold, letterSpacing: 2, marginLeft: 4 },
  secondaryBtn: {
    paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  secondaryText: {
    color: colors.textMuted, fontSize: 14,
    fontWeight: fontWeight.semibold, letterSpacing: 2, marginLeft: 4,
  },
});
