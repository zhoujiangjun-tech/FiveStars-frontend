// 个人中心 —— 头像 + 好友码 + 战绩 + 退出登录
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView, Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, getStoredUser } from '../services/api';
import { colors, radius, fontSize, fontWeight, spacing } from '../theme';
import PressableScale from '../components/PressableScale';

export default function ProfileScreen({ navigation }) {
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation]);

  async function load() {
    try {
      // 同步拉取最新 user 和战绩
      const [s, meResp] = await Promise.all([api.userStats(), api.me().catch(() => null)]);
      setStats(s);
      if (meResp && meResp.user) {
        // 同步到 AsyncStorage,下次离线读
        await AsyncStorage.setItem('user', JSON.stringify(meResp.user));
        setMe(meResp.user);
      } else {
        const u = await getStoredUser();
        setMe(u);
      }
    } catch (e) {
      Alert.alert('加载失败', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['token', 'user']);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  }

  function copyCode() {
    if (!me?.friendCode) return;
    Clipboard.setString(String(me.friendCode));
    Alert.alert('已复制', `好友码 ${me.friendCode} 已复制到剪贴板`);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const total = stats.wins + stats.losses + stats.draws;
  const winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      {/* 用户信息 */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color={colors.gold} />
        </View>
        <Text style={styles.name}>{me?.username || '棋手'}</Text>
        <Text style={styles.uid}>ID: #{me?.id}</Text>
      </View>

      {/* 我的好友码 */}
      <PressableScale onPress={copyCode}>
        <View style={styles.codeCard}>
          <View style={styles.codeLeft}>
            <Ionicons name="keypad" size={22} color={colors.gold} />
            <View>
              <Text style={styles.codeLabel}>我的好友码</Text>
              <Text style={styles.codeHint}>分享给好友，让他搜索加你</Text>
            </View>
          </View>
          <View style={styles.codeRight}>
            <Text style={styles.codeValue}>{me?.friendCode || '------'}</Text>
            <Ionicons name="copy-outline" size={16} color={colors.gold} />
          </View>
        </View>
      </PressableScale>

      {/* 战绩卡片 */}
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.success }]}>{stats.wins}</Text>
          <Text style={styles.statLabel}>胜</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.danger }]}>{stats.losses}</Text>
          <Text style={styles.statLabel}>负</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.textSecondary }]}>{stats.draws}</Text>
          <Text style={styles.statLabel}>平</Text>
        </View>
      </View>

      {/* 胜率 */}
      <View style={styles.rateCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rateText}>胜率</Text>
          <Text style={styles.rateSub}>共对局 {total} 局</Text>
        </View>
        <Text style={styles.rateValue}>{winRate}<Text style={styles.ratePercent}>%</Text></Text>
      </View>

      {/* 快捷入口 */}
      <View style={styles.menuList}>
        <PressableScale onPress={() => navigation.navigate('Friends')}>
          <View style={styles.menuItem}>
            <Ionicons name="people" size={20} color={colors.gold} />
            <Text style={styles.menuText}>好 友</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </PressableScale>
        <PressableScale onPress={() => navigation.navigate('SearchUser')}>
          <View style={styles.menuItem}>
            <Ionicons name="person-add" size={20} color={colors.gold} />
            <Text style={styles.menuText}>添加好友</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </PressableScale>
        <PressableScale onPress={() => navigation.navigate('Invite')}>
          <View style={styles.menuItem}>
            <Ionicons name="game-controller-outline" size={20} color={colors.gold} />
            <Text style={styles.menuText}>邀 请 好友 对 弈</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </PressableScale>
        <PressableScale onPress={() => navigation.navigate('History')}>
          <View style={styles.menuItem}>
            <Ionicons name="time-outline" size={20} color={colors.gold} />
            <Text style={styles.menuText}>对局历史</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </PressableScale>
        <PressableScale onPress={() => navigation.navigate('Match')}>
          <View style={styles.menuItem}>
            <Ionicons name="flash-outline" size={20} color={colors.gold} />
            <Text style={styles.menuText}>快速匹配</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </PressableScale>
      </View>

      {/* 退出 */}
      <PressableScale onPress={logout} style={styles.logoutBtn}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutText}>退出登录</Text>
      </PressableScale>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, width: '100%', maxWidth: 520, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgDeep },

  profileCard: {
    alignItems: 'center', backgroundColor: colors.bgCard, padding: spacing.xl,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.goldDeep, marginBottom: spacing.md,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(212,165,116,0.12)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.gold, marginBottom: spacing.md,
  },
  name: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, letterSpacing: 2 },
  uid: { color: colors.textMuted, fontSize: fontSize.tiny, marginTop: 4, letterSpacing: 2 },

  codeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgCard, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold, marginBottom: spacing.md,
  },
  codeLeft: { flexDirection: 'row', alignItems: 'center' },
  codeLabel: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: fontWeight.semibold, marginLeft: spacing.md, letterSpacing: 2 },
  codeHint: { color: colors.textMuted, fontSize: fontSize.tiny, marginLeft: spacing.md, marginTop: 2 },
  codeRight: { flexDirection: 'row', alignItems: 'center' },
  codeValue: { color: colors.gold, fontSize: fontSize.xl, fontWeight: fontWeight.heavy, letterSpacing: 6, marginRight: 6 },

  statsCard: {
    flexDirection: 'row', backgroundColor: colors.bgCard, padding: spacing.lg,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.goldDeep, marginBottom: spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 30, fontWeight: fontWeight.bold, letterSpacing: 1 },
  statLabel: { color: colors.textMuted, fontSize: fontSize.small, marginTop: 4, letterSpacing: 4 },
  divider: { width: 1, backgroundColor: colors.goldDeep, opacity: 0.4 },

  rateCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, padding: spacing.lg,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.goldDeep, marginBottom: spacing.md,
  },
  rateText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold, letterSpacing: 2 },
  rateSub: { color: colors.textMuted, fontSize: fontSize.tiny, marginTop: 4 },
  rateValue: { color: colors.gold, fontSize: 36, fontWeight: fontWeight.bold, letterSpacing: 1 },
  ratePercent: { fontSize: fontSize.body, color: colors.gold, fontWeight: fontWeight.semibold },

  menuList: { backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.goldDeep, marginBottom: spacing.md, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(166,124,82,0.2)' },
  menuText: { flex: 1, color: colors.textPrimary, fontSize: fontSize.body, marginLeft: spacing.md, letterSpacing: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger,
    paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.md, marginBottom: spacing.xl,
  },
  logoutText: { color: colors.danger, fontSize: fontSize.body, fontWeight: fontWeight.semibold, marginLeft: 6, letterSpacing: 4 },
});
