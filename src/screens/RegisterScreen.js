// 注册页 —— 与登录页同款深色风格
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fontSize, fontWeight, spacing } from '../theme';
import PressableScale from '../components/PressableScale';
import { api, saveAuth } from '../services/api';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  async function onRegister() {
    if (!username || !password) { setError('请输入用户名和密码'); return; }
    if (password !== confirm) { setError('两次输入的密码不一致'); return; }
    if (password.length < 6) { setError('密码至少 6 位'); return; }
    setError('');
    setLoading(true);
    try {
      console.log('[register] request', username);
      const res = await api.register(username.trim(), password);
      console.log('[register] ok', res);
      await saveAuth(res.token, res.user);
      navigation.reset({ index: 0, routes: [{ name: 'Match' }] });
    } catch (e) {
      console.log('[register] error', e);
      setError(e.message || '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.formTitle}>创建账号</Text>
          <Text style={styles.formSub}>注册后即可开始对局</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={colors.gold} style={styles.inputIcon} />
            <TextInput
              style={styles.input} value={username} onChangeText={setUsername}
              placeholder="用户名 (2-20 位)" placeholderTextColor={colors.textMuted} autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.gold} style={styles.inputIcon} />
            <TextInput
              style={styles.input} value={password} onChangeText={setPassword}
              placeholder="密码 (至少 6 位)" placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPwd}
            />
            <TouchableOpacity onPress={() => setShowPwd((s) => !s)} hitSlop={10} style={styles.eyeBtn}>
              <Ionicons
                name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                size={20} color={showPwd ? colors.gold : colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.gold} style={styles.inputIcon} />
            <TextInput
              style={styles.input} value={confirm} onChangeText={setConfirm}
              placeholder="确认密码" placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPwd}
            />
          </View>

          <PressableScale onPress={onRegister} style={styles.primaryBtn} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.textOnGold} /> : (
              <Text style={styles.primaryText}>注 册 并 登 录</Text>
            )}
          </PressableScale>

          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={6} style={styles.linkWrap}>
            <Text style={styles.link}>已有账号？<Text style={styles.linkAccent}>返回登录</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, width: '100%', maxWidth: 520, alignSelf: 'center' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  form: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldDeep,
    padding: spacing.lg,
  },
  formTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, letterSpacing: 4 },
  formSub: { color: colors.textMuted, fontSize: fontSize.small, marginTop: 4, marginBottom: spacing.lg },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F4ECDC', borderRadius: radius.md,
    paddingHorizontal: 12, marginBottom: spacing.md,
    borderLeftWidth: 3, borderLeftColor: colors.gold,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: fontSize.body, color: '#1A1A2E' },
  eyeBtn: { padding: 4, marginLeft: 4 },
  linkWrap: { alignItems: 'center' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.4)',
    borderRadius: radius.md, padding: 10, marginBottom: spacing.md,
  },
  errorText: { color: '#FF6B6B', fontSize: 13, marginLeft: 6, flex: 1 },
  primaryBtn: {
    backgroundColor: colors.gold, paddingVertical: 14, borderRadius: radius.md,
    alignItems: 'center', marginTop: spacing.sm,
    shadowColor: colors.gold, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 4,
  },
  primaryText: { color: colors.textOnGold, fontSize: fontSize.md, fontWeight: fontWeight.heavy, letterSpacing: 4 },
  link: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg, fontSize: fontSize.small },
  linkAccent: { color: colors.gold, fontWeight: fontWeight.semibold },
});
