// 邀请好友对弈 —— 选好友、发送邀请，等待对方接受
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, Modal, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { getSocket, closeSocket } from '../services/socket';
import { colors, radius, fontSize, fontWeight, spacing } from '../theme';
import PressableScale from '../components/PressableScale';

export default function InviteScreen({ navigation, route }) {
  const preselected = route.params?.friend;
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(null); // 正在邀请的 friend
  const [waitingFor, setWaitingFor] = useState(null); // 等待响应的 friend
  const [incoming, setIncoming] = useState(null); // 收到的邀请 { fromId, fromUsername, fromCode }
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.friends();
        setFriends(r.friends || []);
      } catch (e) {
        Alert.alert('加载失败', e.message);
      } finally {
        setLoading(false);
      }
      // 建立 socket 用于接收 match_success / invite_declined / invite_cancelled
      const token = await AsyncStorage.getItem('token');
      const s = getSocket(token);
      socketRef.current = s;

      s.on('match_success', (data) => {
        clearTimer();
        setWaitingFor(null);
        navigation.replace('Game', {
          gameId: data.gameId,
          myColor: data.color,
          opponent: data.opponent,
        });
      });
      // ★ 关键:收到对方发来的邀请
      s.on('invite_received', (data) => {
        setIncoming({
          fromId: data.fromId,
          fromUsername: data.fromUsername,
          fromCode: data.fromCode,
        });
      });
      s.on('invite_declined', (data) => {
        clearTimer();
        setWaitingFor((w) => {
          if (!w) return w;
          Alert.alert('邀请被拒', `${data.byUsername || '对方'} 拒绝了你的邀请`);
          return null;
        });
      });
      s.on('invite_cancelled', () => {
        clearTimer();
        setWaitingFor(null);
      });
      s.on('error', (data) => {
        clearTimer();
        setWaitingFor(null);
        Alert.alert('提示', data?.message || '出错了');
      });
    })();
    return () => {
      const s = socketRef.current;
      if (s) {
        s.off('match_success');
        s.off('invite_received');
        s.off('invite_declined');
        s.off('invite_cancelled');
        s.off('error');
      }
      clearTimer();
    };
  }, [navigation]);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function invite(f) {
    if (waitingFor) return;
    setInviting(f.id);
    socketRef.current?.emit('invite_friend', { toUserId: f.id });
    setInviting(null);
    setWaitingFor(f);
    // 60s 超时
    timerRef.current = setTimeout(() => {
      setWaitingFor((w) => {
        if (w) Alert.alert('超时', '对方没有响应，请稍后再试');
        return null;
      });
    }, 60000);
  }

  function cancelWait() {
    if (waitingFor) {
      socketRef.current?.emit('cancel_invite', { toUserId: waitingFor.id });
    }
    clearTimer();
    setWaitingFor(null);
  }

  function respondIncoming(accept) {
    if (!incoming) return;
    socketRef.current?.emit('invite_response', {
      fromUserId: incoming.fromId,
      accept,
    });
    if (!accept) {
      setIncoming(null);
      // 提示已拒绝
      try {
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(`已拒绝 ${incoming.fromUsername} 的邀请`);
        } else {
          Alert.alert('已拒绝', `已拒绝 ${incoming.fromUsername} 的对弈邀请`);
        }
      } catch (_) {}
    }
    // accept 不用 setIncoming(null),match_success 之后会 replace 跳走
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {waitingFor ? (
        <View style={styles.waitingPanel}>
          <View style={styles.pulseRing}>
            <Ionicons name="game-controller" size={56} color={colors.gold} />
          </View>
          <Text style={styles.waitingTitle}>已向 {waitingFor.username} 发送邀请</Text>
          <Text style={styles.waitingSub}>等待对方接受…</Text>
          <PressableScale onPress={cancelWait} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>取 消 邀 请</Text>
          </PressableScale>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: spacing.md }}
          ListHeaderComponent={
            <Text style={styles.hint}>点击好友卡片右侧按钮发起对弈邀请</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={26} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.username}</Text>
                <Text style={styles.code}>码：{item.friendCode}</Text>
              </View>
              <PressableScale
                onPress={() => invite(item)}
                style={styles.inviteBtn}
                disabled={!!inviting}
              >
                <Ionicons name="paper-plane" size={14} color={colors.textOnGold} />
                <Text style={styles.inviteText}>邀 战</Text>
              </PressableScale>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>暂无好友</Text>
              <Text style={styles.emptySub}>先去添加几个好友吧</Text>
            </View>
          }
        />
      )}

      {/* 收到对方对弈邀请的弹窗 */}
      <Modal
        visible={!!incoming}
        transparent
        animationType="fade"
        onRequestClose={() => respondIncoming(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="game-controller" size={48} color={colors.gold} />
            </View>
            <Text style={styles.modalTitle}>收到对弈邀请</Text>
            <Text style={styles.modalSub}>
              {incoming?.fromUsername || '好友'} 邀请你进行一场五子棋
            </Text>
            {incoming?.fromCode ? (
              <Text style={styles.modalCode}>ID: {incoming.fromCode}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <PressableScale
                onPress={() => respondIncoming(false)}
                style={styles.modalDecline}
                wrapStyle={{ flex: 1, marginRight: 8 }}
              >
                <Ionicons name="close" size={18} color="#FF6B6B" />
                <Text style={styles.modalDeclineText}>拒 绝</Text>
              </PressableScale>
              <PressableScale
                onPress={() => respondIncoming(true)}
                style={styles.modalAccept}
                wrapStyle={{ flex: 1, marginLeft: 8 }}
              >
                <Ionicons name="checkmark" size={18} color={colors.textOnGold} />
                <Text style={styles.modalAcceptText}>接 受</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, width: '100%', maxWidth: 520, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgDeep },
  hint: { color: colors.textMuted, fontSize: fontSize.small, marginBottom: spacing.md, letterSpacing: 2 },

  waitingPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  pulseRing: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.goldDeep,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  waitingTitle: { color: colors.gold, fontSize: fontSize.lg, fontWeight: fontWeight.bold, letterSpacing: 2 },
  waitingSub: { color: colors.textMuted, fontSize: fontSize.small, marginTop: 6, letterSpacing: 2 },
  cancelBtn: {
    marginTop: spacing.xl, paddingHorizontal: 32, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md,
  },
  cancelText: { color: colors.danger, fontSize: fontSize.body, fontWeight: fontWeight.bold, letterSpacing: 4 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldDeep, marginBottom: spacing.sm,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(212,165,116,0.12)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.goldDeep, marginRight: spacing.md,
  },
  name: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: 1 },
  code: { color: colors.textMuted, fontSize: fontSize.tiny, marginTop: 2, letterSpacing: 2 },

  inviteBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
  },
  inviteText: { color: colors.textOnGold, fontSize: fontSize.small, fontWeight: fontWeight.bold, marginLeft: 4, letterSpacing: 4 },

  empty: { alignItems: 'center', padding: spacing.xxl, marginTop: 40 },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.md, letterSpacing: 2 },
  emptySub: { color: colors.textMuted, fontSize: fontSize.small, marginTop: 4 },

  // 收到对弈邀请弹窗
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: {
    width: '100%', maxWidth: 360, backgroundColor: colors.bgCard,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.goldDeep,
    padding: spacing.lg, alignItems: 'center',
  },
  modalIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(212,165,116,0.12)', borderWidth: 1, borderColor: colors.goldDeep,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  modalTitle: { color: colors.gold, fontSize: fontSize.lg, fontWeight: fontWeight.bold, letterSpacing: 3, marginBottom: 6 },
  modalSub: { color: colors.textPrimary, fontSize: fontSize.body, textAlign: 'center', marginBottom: 4 },
  modalCode: { color: colors.textMuted, fontSize: fontSize.small, marginBottom: spacing.md, letterSpacing: 2 },
  modalActions: { flexDirection: 'row', width: '100%', marginTop: spacing.md },
  modalDecline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.danger,
    backgroundColor: 'rgba(255,107,107,0.08)',
  },
  modalDeclineText: { color: '#FF6B6B', fontSize: fontSize.body, fontWeight: fontWeight.bold, marginLeft: 4, letterSpacing: 4 },
  modalAccept: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: colors.gold,
  },
  modalAcceptText: { color: colors.textOnGold, fontSize: fontSize.body, fontWeight: fontWeight.bold, marginLeft: 4, letterSpacing: 4 },
});
