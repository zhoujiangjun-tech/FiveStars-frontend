// 好友列表：分 Tab（好友 / 请求），支持搜索、删除、邀请对弈
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { colors, radius, fontSize, fontWeight, spacing } from '../theme';
import PressableScale from '../components/PressableScale';

export default function FriendsScreen({ navigation, route }) {
  const [tab, setTab] = useState(route.params?.tab || 'friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [fRes, rRes] = await Promise.all([api.friends(), api.friendRequests()]);
      setFriends(fRes.friends || []);
      setRequests(rRes.requests || []);
    } catch (e) {
      Alert.alert('加载失败', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      setLoading(true);
      load();
    });
    load();
    return unsub;
  }, [navigation, load]);

  // 订阅 socket：实时收到对方发来的好友请求 / 对方接受了请求
  useEffect(() => {
    let s = null;
    let mounted = true;
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token || !mounted) return;
      s = getSocket(token);
      const onRequest = () => {
        // 收到好友请求，刷新列表 + 切到请求 Tab + 弹个 toast/alert
        load();
        setTab('requests');
        try {
          if (typeof window !== 'undefined' && window.alert) {
            window.alert('新好友请求\n请到好友-请求页查看');
          } else {
            Alert.alert('新好友请求', '请到好友-请求页查看');
          }
        } catch (e) {}
      };
      const onAccepted = (data) => {
        // 对方接受了你的请求
        load();
        try {
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(`${data?.byUsername || '对方'} 已接受你的好友请求`);
          } else {
            Alert.alert('好友请求已接受', `${data?.byUsername || '对方'} 已接受你的好友请求`);
          }
        } catch (e) {}
      };
      s.on('friend_request', onRequest);
      s.on('friend_accepted', onAccepted);
    })();
    return () => {
      mounted = false;
      if (s) {
        try { s.off('friend_request'); } catch (e) {}
        try { s.off('friend_accepted'); } catch (e) {}
      }
    };
  }, [load]);

  function onRefresh() { setRefreshing(true); load(); }

  async function onAccept(req) {
    try {
      await api.respondFriend(req.id, true);
      Alert.alert('已添加', `${req.fromUsername} 已加入你的好友列表`);
      load();
    } catch (e) {
      Alert.alert('操作失败', e.message);
    }
  }

  async function onReject(req) {
    try {
      await api.respondFriend(req.id, false);
      load();
    } catch (e) {
      Alert.alert('操作失败', e.message);
    }
  }

  function onRemove(f) {
    Alert.alert('删除好友', `确定删除 ${f.username}？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          try {
            await api.removeFriend(f.id);
            load();
          } catch (e) { Alert.alert('失败', e.message); }
        },
      },
    ]);
  }

  function renderFriend({ item }) {
    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={22} color={colors.gold} />
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.name} numberOfLines={1}>{item.username}</Text>
          <Text style={styles.code} numberOfLines={1}>码：{item.friendCode}</Text>
        </View>
        <PressableScale
          onPress={() => navigation.navigate('Invite', { friend: item })}
          style={styles.inviteBtn}
          wrapStyle={styles.inviteWrap}
        >
          <Ionicons name="game-controller" size={14} color={colors.textOnGold} />
          <Text style={styles.inviteText}>邀战</Text>
        </PressableScale>
        <PressableScale
          onPress={() => onRemove(item)}
          style={styles.removeBtn}
          wrapStyle={styles.removeWrap}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </PressableScale>
      </View>
    );
  }

  function renderRequest({ item }) {
    return (
      <View style={styles.reqCard}>
        <View style={styles.reqTopRow}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(244,208,63,0.16)' }]}>
            <Ionicons name="person-add" size={24} color={colors.goldBright} />
          </View>
          <View style={styles.reqInfo}>
            <Text style={styles.name} numberOfLines={1}>{item.fromUsername}</Text>
            <Text style={styles.code} numberOfLines={1}>好友码：{item.fromCode}</Text>
          </View>
        </View>
        <View style={styles.reqActions}>
          <PressableScale
            onPress={() => onReject(item)}
            style={[styles.reqBtn, styles.reqReject]}
            wrapStyle={{ flex: 1, marginHorizontal: 4 }}
          >
            <Ionicons name="close" size={16} color={colors.danger} />
            <Text style={[styles.reqBtnText, { color: colors.danger }]}>拒绝</Text>
          </PressableScale>
          <PressableScale
            onPress={() => onAccept(item)}
            style={[styles.reqBtn, styles.reqAccept]}
            wrapStyle={{ flex: 1, marginHorizontal: 4 }}
          >
            <Ionicons name="checkmark" size={16} color={colors.textOnGold} />
            <Text style={[styles.reqBtnText, { color: colors.textOnGold }]}>同意</Text>
          </PressableScale>
        </View>
      </View>
    );
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
      <View style={styles.content}>
      {/* 顶部操作栏 */}
      <View style={styles.topBar}>
        <PressableScale onPress={() => navigation.navigate('SearchUser')} style={styles.searchBtn}>
          <Ionicons name="search" size={16} color={colors.textOnGold} />
          <Text style={styles.searchText}>搜索好友码</Text>
        </PressableScale>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <PressableScale onPress={() => setTab('friends')} style={[styles.tab, tab === 'friends' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>
            好友 ({friends.length})
          </Text>
        </PressableScale>
        <PressableScale onPress={() => setTab('requests')} style={[styles.tab, tab === 'requests' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
            请求 {requests.length > 0 ? `(${requests.length})` : ''}
          </Text>
          {requests.length > 0 && <View style={styles.dot} />}
        </PressableScale>
      </View>

      {tab === 'friends' ? (
        <FlatList
          data={friends}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderFriend}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>还没有好友</Text>
              <Text style={styles.emptySub}>点击上方搜索按钮添加好友</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderRequest}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="mail-unread-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>暂无好友请求</Text>
            </View>
          }
        />
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  // web 大屏下,限制最大宽度,居中显示,模拟手机布局
  content: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgDeep },

  topBar: { padding: spacing.md, paddingBottom: 0 },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.gold, paddingVertical: 12, borderRadius: radius.md,
  },
  searchText: { color: colors.textOnGold, fontWeight: fontWeight.bold, marginLeft: 6, letterSpacing: 4 },

  tabs: { flexDirection: 'row', paddingHorizontal: spacing.md, marginTop: spacing.md },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: colors.bgCard, marginHorizontal: 4,
    borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md,
    borderTopWidth: 1, borderColor: colors.goldDeep, borderLeftWidth: 1, borderRightWidth: 1,
    position: 'relative',
  },
  tabActive: { backgroundColor: colors.bgElev, borderBottomColor: colors.bgElev },
  tabText: { color: colors.textMuted, fontSize: fontSize.small, letterSpacing: 2 },
  tabTextActive: { color: colors.gold, fontWeight: fontWeight.bold },
  dot: { position: 'absolute', top: 6, right: 16, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },

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
  friendInfo: { flex: 1, minWidth: 0, marginRight: spacing.sm },

  inviteBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.gold, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.pill, marginRight: 6,
  },
  inviteWrap: {},
  inviteText: { color: colors.textOnGold, fontSize: fontSize.tiny, fontWeight: fontWeight.bold, marginLeft: 4, letterSpacing: 2 },
  removeBtn: { padding: 6, borderRadius: radius.sm },
  removeWrap: {},

  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, marginLeft: 6 },
  acceptBtn: { backgroundColor: colors.success },
  rejectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  actionText: { fontSize: fontSize.tiny, fontWeight: fontWeight.bold, letterSpacing: 2 },

  // 好友请求卡（更清晰的两段式布局）
  reqCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldDeep, marginBottom: spacing.md,
    padding: spacing.md,
  },
  reqTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  reqInfo: { flex: 1, minWidth: 0 },
  reqActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  reqBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: radius.md,
  },
  reqReject: { backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.4)' },
  reqAccept: { backgroundColor: colors.gold },
  reqBtnText: { fontSize: fontSize.small, fontWeight: fontWeight.bold, marginLeft: 6, letterSpacing: 2 },

  empty: { alignItems: 'center', padding: spacing.xxl, marginTop: 40 },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.md, letterSpacing: 2 },
  emptySub: { color: colors.textMuted, fontSize: fontSize.small, marginTop: 4 },
});
