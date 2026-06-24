// 匹配大厅:仿真实游戏大厅风格
// 顶部:玩家卡(头像/昵称/段位/ID)
// 中部:大匹配按钮 + 实时状态
// 底部:四个功能入口卡片
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, Animated, Easing, Dimensions, Platform, TouchableOpacity, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fontSize, fontWeight, spacing } from '../theme';
import PressableScale from '../components/PressableScale';
import { getSocket, closeSocket } from '../services/socket';
import { clearAuth, getStoredUser, api } from '../services/api';

const { width: WIN_W } = Dimensions.get('window');

// ===== 旋转金环 =====
function RotatingRing({ size = 220, color = colors.gold, trackOpacity = 0.15 }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="46" stroke={color} strokeOpacity={trackOpacity} strokeWidth="2" fill="none" />
        <Circle
          cx="50" cy="50" r="46"
          stroke={color} strokeWidth="2" fill="none"
          strokeLinecap="round"
          strokeDasharray="70 220"
        />
      </Svg>
    </Animated.View>
  );
}

// ===== 旋转金环(反向,装饰用) =====
function RotatingRingReverse({ size = 280, color = colors.goldDeep, trackOpacity = 0.3 }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  return (
    <Animated.View
      style={{ position: 'absolute', width: size, height: size, transform: [{ rotate }] }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle
          cx="50" cy="50" r="46"
          stroke={color} strokeOpacity={trackOpacity} strokeWidth="0.6" fill="none"
          strokeDasharray="3 6"
        />
      </Svg>
    </Animated.View>
  );
}

// ===== 跳动的三点 =====
function BouncingDots() {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const mk = (v, delay) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: -8, duration: 360, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(v, { toValue: 0, duration: 360, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      ])
    );
    mk(a1, 0).start();
    mk(a2, 160).start();
    mk(a3, 320).start();
  }, []);
  const dot = (v) => ({
    width: 7, height: 7, borderRadius: 4, backgroundColor: colors.goldBright,
    marginHorizontal: 4, transform: [{ translateY: v }],
  });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
      <Animated.View style={dot(a1)} />
      <Animated.View style={dot(a2)} />
      <Animated.View style={dot(a3)} />
    </View>
  );
}

// ===== 头像(根据昵称生成颜色) =====
function Avatar({ name, size = 56, ring = true }) {
  const palette = ['#D4A574', '#8DA9C4', '#A0C4FF', '#BDB2FF', '#FFB4A2', '#EAC435', '#06D6A0'];
  const idx = (name || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  const bg = palette[idx];
  const ch = (name || '?').trim().slice(0, 1).toUpperCase() || '?';
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: ring ? 2 : 0, borderColor: colors.gold,
    }}>
      <Text style={{ color: '#1A1A2E', fontSize: size * 0.42, fontWeight: '800' }}>{ch}</Text>
    </View>
  );
}

// ===== 段位徽章 =====
function RankBadge({ wins = 0, draws = 0 }) {
  const rank = (() => {
    if (wins >= 100) return { label: '★ 棋圣', color: '#E0AA3E' };
    if (wins >= 50) return { label: '◆ 宗师', color: '#B0C4DE' };
    if (wins >= 20) return { label: '◇ 高手', color: '#7FDBFF' };
    if (wins >= 5) return { label: '✦ 棋士', color: '#B5E61D' };
    return { label: '· 新手', color: '#C0C0C0' };
  })();
  return (
    <View style={{
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: rank.color + '22',
      borderWidth: 1, borderColor: rank.color,
    }}>
      <Text style={{ color: rank.color, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>{rank.label}</Text>
    </View>
  );
}

export default function MatchScreen({ navigation }) {
  const [matching, setMatching] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0, total: 0 });
  const [onlineCount, setOnlineCount] = useState(0);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [incomingInvite, setIncomingInvite] = useState(null); // 收到的对弈邀请
  const socketRef = useRef(null);

  async function refreshFriendRequestCount() {
    try {
      const r = await api.friendRequests();
      setFriendRequestCount((r.requests || []).length);
    } catch (_) {}
  }

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      refreshFriendRequestCount();
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const u = await getStoredUser();
      setUser(u);
      try {
        const s = await api.userStats();
        // 后端 userStats 返回 { user, total, wins, losses, draws }
        if (s?.user) {
          // 同步把带 friendCode 的 user 写回本地
          await AsyncStorage.setItem('user', JSON.stringify(s.user));
          setUser(s.user);
        }
        setStats({
          wins: s?.wins || 0,
          losses: s?.losses || 0,
          draws: s?.draws || 0,
          total: s?.total || 0,
        });
      } catch (_) {}
      const token = await AsyncStorage.getItem('token');
      const s = getSocket(token);
      socketRef.current = s;

      s.on('connect_error', (err) => Alert.alert('连接错误', err.message));
      s.on('online_count', (data) => setOnlineCount(data?.count || 0));
      s.on('match_waiting', () => setMatching(true));
      s.on('match_success', (data) => {
        setMatching(false);
        navigation.replace('Game', {
          gameId: data.gameId,
          myColor: data.color,
          opponent: data.opponent,
        });
      });
      s.on('error', (data) => Alert.alert('提示', data?.message || '出错了'));
      // 收到好友请求：红点 +1 + 弹个轻提示
      s.on('friend_request', () => {
        setFriendRequestCount((c) => c + 1);
        try {
          if (typeof window !== 'undefined' && window.alert) {
            window.alert('收到新的好友请求\n请到「好友」页面查看');
          } else {
            Alert.alert('新好友请求', '请到「好友」页面查看');
          }
        } catch (_) {}
      });
      s.on('friend_accepted', () => {
        // 对方接受了我发的好友请求：刷新（不影响红点）
      });
      // ★ 收到对方发来的对弈邀请(即使在 MatchScreen 也能收到)
      s.on('invite_received', (data) => {
        // 弹窗统一由 App.js GlobalPopups 处理,这里不再 setIncomingInvite
        console.log('[MatchScreen] invite_received ignored, handled by GlobalPopups', data);
      });
      // 注: rematch_requested 已由 App.js GlobalPopups 全局监听,这里不再重复订阅
      // 初次拉一次
      refreshFriendRequestCount();
    })();
    return () => {
      const s = socketRef.current;
      if (s) {
        s.off('online_count');
        s.off('match_waiting');
        s.off('match_success');
        s.off('error');
        s.off('friend_request');
        s.off('friend_accepted');
        s.off('invite_received');
      }
    };
  }, [navigation]);

  function startMatch() {
    const sock = socketRef.current;
    if (!sock) {
      Alert.alert('提示', '尚未连接服务器，请稍后再试');
      return;
    }
    const tryEmit = () => {
      if (!sock.connected) return false;
      sock.emit('join_match');
      setMatching(true);
      return true;
    };
    if (tryEmit()) return;
    // 未连接:等连接上再发(限制最多 6 秒)
    let waited = 0;
    const tick = setInterval(() => {
      waited += 250;
      if (tryEmit()) {
        clearInterval(tick);
      } else if (waited >= 6000) {
        clearInterval(tick);
        Alert.alert('提示', '连接服务器超时，请稍后再试');
      }
    }, 250);
    Alert.alert('提示', '正在连接服务器…');
  }

  function cancelMatch() {
    if (socketRef.current) socketRef.current.emit('cancel_match');
    setMatching(false);
  }

  function respondInvite(accept) {
    if (!incomingInvite) return;
    socketRef.current?.emit('invite_response', {
      fromUserId: incomingInvite.fromId,
      accept,
    });
    if (!accept) {
      setIncomingInvite(null);
      try {
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(`已拒绝 ${incomingInvite.fromUsername} 的邀请`);
        } else {
          Alert.alert('已拒绝', `已拒绝 ${incomingInvite.fromUsername} 的对弈邀请`);
        }
      } catch (_) {}
    }
    // accept 后 match_success 事件会 replace 跳到 Game,不需要 setIncomingInvite(null)
  }

  async function logout() {
    let ok = true;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
        ok = window.confirm('确定要退出当前账号吗？');
      } else {
        ok = await new Promise((resolve) => {
          Alert.alert('退出登录', '确定要退出当前账号吗？', [
            { text: '取消', style: 'cancel', onPress: () => resolve(false) },
            { text: '退出', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });
      }
    } catch (_) {
      ok = true;
    }
    if (!ok) return;
    try { closeSocket(); } catch (_) {}
    try { await clearAuth(); } catch (_) {}
    try {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (_) {
      try { navigation.replace('Login'); } catch (_) {}
    }
  }

  const winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* 顶部标题区 */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Svg width={32} height={32} viewBox="0 0 32 32">
            <Defs>
              <LinearGradient id="logoG" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.goldBright} />
                <Stop offset="1" stopColor={colors.goldDeep} />
              </LinearGradient>
            </Defs>
            <Circle cx="16" cy="16" r="14" stroke="url(#logoG)" strokeWidth="2" fill="none" />
            <Circle cx="16" cy="16" r="3" fill={colors.goldBright} />
            <Circle cx="16" cy="6" r="1.6" fill={colors.goldBright} />
            <Circle cx="16" cy="26" r="1.6" fill={colors.goldBright} />
            <Circle cx="6" cy="16" r="1.6" fill={colors.goldBright} />
            <Circle cx="26" cy="16" r="1.6" fill={colors.goldBright} />
          </Svg>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.brandTitle}>五星连珠</Text>
            <Text style={styles.brandSub}>FIVE STARS · GOMOKU</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.onlineChip}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>在线 {onlineCount}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.6} hitSlop={8}>
            <Ionicons name="log-out" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 玩家信息卡 */}
      <View style={styles.playerCard}>
        <View style={styles.playerRow}>
          <Avatar name={user?.username || '?'} size={56} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.playerName}>{user?.username || '棋手'}</Text>
              <RankBadge wins={stats.wins} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center' }}>
              <View style={styles.idPill}>
                <Ionicons name="finger-print-outline" size={12} color={colors.gold} />
                <Text style={styles.idPillText}>ID {user?.friendCode || '------'}</Text>
              </View>
              <Text style={styles.winRate}>胜率 {winRate}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.statRow}>
          <StatCell label="胜" value={stats.wins} color="#7FDBFF" />
          <View style={styles.divider} />
          <StatCell label="负" value={stats.losses} color="#FF6B6B" />
          <View style={styles.divider} />
          <StatCell label="平" value={stats.draws} color="#E0AA3E" />
          <View style={styles.divider} />
          <StatCell label="总数" value={stats.total} color={colors.textPrimary} />
        </View>
      </View>

      {/* 匹配按钮区 */}
      <View style={styles.matchArea}>
        <View style={styles.ringWrap}>
          {!matching && <RotatingRingReverse size={300} />}
          <RotatingRing size={matching ? 220 : 240} />
          <PressableScale
            onPress={matching ? cancelMatch : startMatch}
            style={styles.bigButton}
          >
            <Ionicons
              name={matching ? 'close' : 'flash'}
              size={48}
              color={colors.textOnGold}
            />
            <Text style={styles.bigButtonText}>
              {matching ? '取消' : '匹配'}
            </Text>
            <Text style={styles.bigButtonSub}>
              {matching ? '点击取消' : '点击开始'}
            </Text>
          </PressableScale>
        </View>

        <View style={styles.statusBox}>
          {matching ? (
            <>
              <Text style={styles.statusTitle}>正在搜索对手…</Text>
              <BouncingDots />
              <Text style={styles.statusSub}>当前等待 {Math.max(1, onlineCount - 1)} 人</Text>
            </>
          ) : (
            <>
              <Text style={styles.statusTitle}>准 备 就 绪</Text>
              <Text style={styles.statusSub}>点击中央按钮开始一场五子棋对决</Text>
            </>
          )}
        </View>
      </View>

      {/* 底部功能区 */}
      <View style={styles.bottom}>
        <BottomTile icon="people" label="好友" onPress={() => navigation.navigate('Friends')} badge={friendRequestCount} />
        <BottomTile icon="paper-plane" label="邀战" onPress={() => navigation.navigate('Invite')} />
        <BottomTile icon="time" label="历史" onPress={() => navigation.navigate('History')} />
        <BottomTile icon="person" label="我的" onPress={() => navigation.navigate('Profile')} />
      </View>

      {/* ★ 邀请弹窗已统一由 App.js GlobalPopups 显示,这里不再重复 */}
    </View>
  );
}

function StatCell({ label, value, color }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, letterSpacing: 2 }}>{label}</Text>
    </View>
  );
}

function BottomTile({ icon, label, onPress, danger, badge }) {
  return (
    <PressableScale onPress={onPress} style={styles.tileWrap}>
      <View style={[styles.tile, danger && { borderColor: 'rgba(255,107,107,0.4)' }]}>
        <Ionicons name={icon} size={22} color={danger ? '#FF6B6B' : colors.gold} />
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tileLabel, danger && { color: '#FF6B6B' }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, maxWidth: 520, width: '100%', alignSelf: 'center' },

  // 顶部 header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  brandTitle: { color: colors.gold, fontSize: 22, fontWeight: '800', letterSpacing: 4 },
  brandSub: { color: colors.textMuted, fontSize: 9, letterSpacing: 2, marginTop: 2 },
  onlineChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill, backgroundColor: 'rgba(127,219,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(127,219,255,0.25)',
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7FDBFF', marginRight: 6 },
  onlineText: { color: '#7FDBFF', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 18, marginLeft: 8,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },

  // 玩家卡
  playerCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.goldDeep,
    padding: spacing.md, marginBottom: spacing.md,
  },
  playerRow: { flexDirection: 'row', alignItems: 'center' },
  playerName: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', letterSpacing: 1, marginRight: 8 },
  idPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(212,165,116,0.1)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.goldDeep,
  },
  idPillText: { color: colors.gold, fontSize: 11, marginLeft: 4, fontWeight: '600', letterSpacing: 1 },
  winRate: { color: colors.textSecondary, fontSize: 12, marginLeft: 10, fontWeight: '600' },

  statRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: radius.md, paddingVertical: 10,
  },
  divider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },

  // 匹配区
  matchArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringWrap: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  bigButton: {
    position: 'absolute', width: 170, height: 170, borderRadius: 85,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.gold, shadowOpacity: 0.6, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16,
    elevation: 12,
    borderWidth: 3, borderColor: '#FFE7B0',
  },
  bigButtonText: {
    color: colors.textOnGold, fontSize: 28, fontWeight: '900', letterSpacing: 6, marginTop: 4,
  },
  bigButtonSub: {
    color: colors.textOnGold, fontSize: 10, marginTop: 4, letterSpacing: 2, opacity: 0.75,
  },

  statusBox: { marginTop: 28, alignItems: 'center' },
  statusTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 4 },
  statusSub: { color: colors.textMuted, fontSize: 12, marginTop: 6, letterSpacing: 1 },

  // 底部
  bottom: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  tileWrap: { alignItems: 'center', flex: 1 },
  tile: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.goldDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 6, letterSpacing: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF4D4F',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.bgDeep,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 12 },

  // 收到对弈邀请弹窗
  inviteBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  inviteCard: {
    width: '100%', maxWidth: 360, backgroundColor: colors.bgCard,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.goldDeep,
    padding: spacing.lg, alignItems: 'center',
  },
  inviteIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(212,165,116,0.12)', borderWidth: 1, borderColor: colors.goldDeep,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  inviteTitle: { color: colors.gold, fontSize: 18, fontWeight: '800', letterSpacing: 3, marginBottom: 6 },
  inviteSub: { color: colors.textPrimary, fontSize: 14, textAlign: 'center', marginBottom: 4 },
  inviteCode: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md, letterSpacing: 2 },
  inviteActions: { flexDirection: 'row', width: '100%', marginTop: spacing.md },
  inviteDecline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255,107,107,0.08)',
  },
  inviteDeclineText: { color: '#FF6B6B', fontSize: 14, fontWeight: '800', marginLeft: 4, letterSpacing: 4 },
  inviteAccept: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: colors.gold,
  },
  inviteAcceptText: { color: colors.textOnGold, fontSize: 14, fontWeight: '800', marginLeft: 4, letterSpacing: 4 },
});
