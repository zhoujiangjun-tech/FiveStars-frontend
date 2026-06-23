// 历史对局列表 —— 卡片式 + 结果标签
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { colors, radius, fontSize, fontWeight, spacing } from '../theme';
import PressableScale from '../components/PressableScale';

const RESULT_STYLE = {
  '胜': { bg: 'rgba(46, 204, 113, 0.18)', color: colors.success, icon: 'trophy' },
  '负': { bg: 'rgba(199, 62, 29, 0.20)', color: colors.danger, icon: 'sad-outline' },
  '平': { bg: 'rgba(154, 165, 178, 0.20)', color: colors.textMuted, icon: 'remove-circle-outline' },
  '进行中': { bg: 'rgba(212, 165, 116, 0.18)', color: colors.gold, icon: 'time-outline' },
};

export default function HistoryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [games, setGames] = useState([]);

  async function load() {
    try {
      const data = await api.myGames();
      setGames(data.games || []);
    } catch (e) {
      Alert.alert('加载失败', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function onRefresh() { setRefreshing(true); load(); }

  function renderItem({ item }) {
    const r = RESULT_STYLE[item.myResult] || RESULT_STYLE['进行中'];
    const opponentName = item.black?.username === item.white?.username
      ? '未知对手'
      : `vs ${item.black?.username} / ${item.white?.username}`;
    const dateText = (item.createdAt || '').replace('T', ' ').slice(0, 16);
    return (
      <PressableScale onPress={() => navigation.navigate('Replay', { gameId: item.id })}>
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>#{item.id}</Text>
            <Text style={styles.cardSub}>{opponentName}</Text>
            <Text style={styles.cardDate}>{dateText}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: r.bg }]}>
            <Ionicons name={r.icon} size={14} color={r.color} />
            <Text style={[styles.tagText, { color: r.color }]}>{item.myResult}</Text>
          </View>
        </View>
      </PressableScale>
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
      <FlatList
        data={games}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>还没有对局记录</Text>
            <Text style={styles.emptySub}>去大厅匹配一局吧</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, width: '100%', maxWidth: 520, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgDeep },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldDeep, marginBottom: spacing.sm,
  },
  cardTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: 1 },
  cardSub: { color: colors.textSecondary, fontSize: fontSize.small, marginTop: 4 },
  cardDate: { color: colors.textMuted, fontSize: fontSize.tiny, marginTop: 4, letterSpacing: 1 },

  tag: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
  },
  tagText: { marginLeft: 4, fontSize: fontSize.small, fontWeight: fontWeight.bold, letterSpacing: 2 },

  empty: { alignItems: 'center', padding: spacing.xxl, marginTop: 60 },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.md, letterSpacing: 2 },
  emptySub: { color: colors.textMuted, fontSize: fontSize.small, marginTop: 4 },
});
