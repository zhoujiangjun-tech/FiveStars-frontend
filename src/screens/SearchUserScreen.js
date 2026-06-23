// 按 6 位数字好友码搜索用户并发送好友请求
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { colors, radius, fontSize, fontWeight, spacing } from '../theme';
import PressableScale from '../components/PressableScale';

export default function SearchUserScreen({ navigation }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);

  async function onSearch() {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) return Alert.alert('提示', '请输入 6 位数字好友码');
    setLoading(true);
    setResult(null);
    try {
      const data = await api.searchUser(trimmed);
      if (!data.user) {
        setResult({ notFound: true });
      } else {
        setResult({ user: data.user, isFriend: data.isFriend });
      }
    } catch (e) {
      Alert.alert('搜索失败', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function onSendRequest() {
    if (!result?.user) return;
    setSending(true);
    try {
      const r = await api.sendFriendRequest({ toUserId: result.user.id });
      if (r.status === 'already_friend') {
        Alert.alert('提示', '对方已是你的好友');
      } else if (r.status === 'already_requested') {
        Alert.alert('提示', '你已发送过请求，等待对方确认');
      } else if (r.status === 'accepted') {
        Alert.alert('已添加', `你和 ${result.user.username} 已成为好友`);
        navigation.goBack();
      } else {
        Alert.alert('已发送', '好友请求已发送，等待对方确认');
        setResult({ ...result, isFriend: false, requested: true });
      }
    } catch (e) {
      Alert.alert('发送失败', e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.body}>
        <Text style={styles.title}>输入 6 位数字好友码</Text>
        <Text style={styles.sub}>向对方申请添加为好友</Text>

        <View style={styles.inputWrap}>
          <Ionicons name="keypad-outline" size={20} color={colors.gold} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder="例如 123456"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        <PressableScale onPress={onSearch} style={styles.searchBtn} disabled={loading || code.length !== 6}>
          {loading ? <ActivityIndicator color={colors.textOnGold} /> : (
            <>
              <Ionicons name="search" size={18} color={colors.textOnGold} />
              <Text style={styles.searchText}>查 找</Text>
            </>
          )}
        </PressableScale>

        {result?.notFound && (
          <View style={styles.resultCard}>
            <Ionicons name="sad-outline" size={36} color={colors.textMuted} />
            <Text style={styles.resultText}>没找到对应用户</Text>
            <Text style={styles.resultSub}>请检查好友码是否正确</Text>
          </View>
        )}

        {result?.user && (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{result.user.username}</Text>
              <Text style={styles.userCode}>码：{result.user.friendCode}</Text>
            </View>
            {result.isFriend ? (
              <View style={[styles.tag, { backgroundColor: 'rgba(46,204,113,0.18)' }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.tagText, { color: colors.success }]}>已是好友</Text>
              </View>
            ) : result.requested ? (
              <View style={[styles.tag, { backgroundColor: 'rgba(212,165,116,0.18)' }]}>
                <Ionicons name="hourglass" size={14} color={colors.gold} />
                <Text style={[styles.tagText, { color: colors.gold }]}>已请求</Text>
              </View>
            ) : (
              <PressableScale onPress={onSendRequest} style={styles.addBtn} disabled={sending}>
                {sending ? <ActivityIndicator color={colors.textOnGold} /> : (
                  <>
                    <Ionicons name="person-add" size={14} color={colors.textOnGold} />
                    <Text style={styles.addText}>加好友</Text>
                  </>
                )}
              </PressableScale>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, width: '100%', maxWidth: 520, alignSelf: 'center' },
  body: { padding: spacing.lg },

  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, letterSpacing: 2 },
  sub: { color: colors.textMuted, fontSize: fontSize.small, marginTop: 4, marginBottom: spacing.lg },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    paddingHorizontal: 12, borderWidth: 1, borderColor: colors.goldDeep,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 22, color: colors.textPrimary, letterSpacing: 8, textAlign: 'center', fontWeight: fontWeight.bold },

  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.gold, paddingVertical: 14, borderRadius: radius.md,
    marginTop: spacing.md,
  },
  searchText: { color: colors.textOnGold, fontSize: fontSize.body, fontWeight: fontWeight.bold, marginLeft: 6, letterSpacing: 4 },

  resultCard: {
    alignItems: 'center', padding: spacing.xl, marginTop: spacing.lg,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.goldDeep,
  },
  resultText: { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.sm, letterSpacing: 2 },
  resultSub: { color: colors.textMuted, fontSize: fontSize.small, marginTop: 4 },

  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldDeep, marginTop: spacing.lg,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(212,165,116,0.12)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.gold, marginRight: spacing.md,
  },
  userName: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, letterSpacing: 2 },
  userCode: { color: colors.gold, fontSize: fontSize.small, marginTop: 4, letterSpacing: 2 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
  },
  addText: { color: colors.textOnGold, fontSize: fontSize.small, fontWeight: fontWeight.bold, marginLeft: 4, letterSpacing: 2 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  tagText: { marginLeft: 4, fontSize: fontSize.tiny, fontWeight: fontWeight.bold, letterSpacing: 2 },
});
