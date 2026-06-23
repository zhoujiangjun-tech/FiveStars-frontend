import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { registerRootComponent } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Text, Modal, AppState, ScrollView, Platform, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MatchScreen from './src/screens/MatchScreen';
import GameScreen from './src/screens/GameScreen';
import ReplayScreen from './src/screens/ReplayScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import SearchUserScreen from './src/screens/SearchUserScreen';
import InviteScreen from './src/screens/InviteScreen';
import PressableScale from './src/components/PressableScale';
import { colors, radius, fontSize, fontWeight, spacing } from './src/theme';
import { getSocket, closeSocket, onGlobal } from './src/services/socket';
import { getToken, setToken, loadToken, clearToken } from './src/services/tokenCache';

const Stack = createNativeStackNavigator();

const NavTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bgDeep,
    card: colors.bgBase,
    text: colors.textPrimary,
    border: colors.goldDeep,
    primary: colors.gold,
    notification: colors.gold,
  },
};

// 全局弹窗组件：邀请对弈 / 好友请求 / 再来一局 / 对方离开
function GlobalPopups({ navigate }) {
  const [invite, setInvite] = useState(null);
  const [friendReq, setFriendReq] = useState(null);
  const [friendAccepted, setFriendAccepted] = useState(null);
  const [rematch, setRematch] = useState(null);
  const [opponentLeft, setOpponentLeft] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let unsubs = [];
    (async () => {
      const token = await loadToken();
      if (!token) return;
      setToken(token);
      // 确保 socket 已连接
      getSocket(token);
      // 使用全局事件总线,重连/切换 token 都不会漏掉事件
      unsubs.push(onGlobal('invite_received', (data) => {
        console.log('[GlobalPopups] invite_received', data);
        if (mounted) setInvite(data);
      }));
      unsubs.push(onGlobal('friend_request', (data) => {
        console.log('[GlobalPopups] friend_request', data);
        if (mounted) setFriendReq(data);
      }));
      unsubs.push(onGlobal('friend_accepted', (data) => {
        console.log('[GlobalPopups] friend_accepted', data);
        if (mounted) setFriendAccepted(data);
      }));
      // ★ 再来一局邀请(全局监听,任何 screen 都能收到)
      unsubs.push(onGlobal('rematch_requested', (data) => {
        console.log('[GlobalPopups] rematch_requested received', data);
        if (mounted) setRematch(data);
      }));
      // 对方离线
      unsubs.push(onGlobal('opponent_disconnected', (data) => {
        console.log('[GlobalPopups] opponent_disconnected', data);
        if (mounted) {
          setOpponentLeft({ userId: data.userId, reason: 'disconnected' });
          setTimeout(() => {
            if (mounted) setOpponentLeft(null);
          }, 4000);
        }
      }));
    })();
    return () => {
      mounted = false;
      unsubs.forEach((u) => { try { u && u(); } catch (_) {} });
    };
  }, []);

  function respondInvite(accept) {
    console.log('[GlobalPopups] respondInvite', accept, 'invite=', invite);
    if (!invite) return;
    const s = getSocket(getToken());
    if (!s) {
      console.log('[GlobalPopups] no socket, cannot respond');
      Alert.alert('提示', '连接已断开，请稍后重试');
      return;
    }
    s.emit('invite_response', { fromUserId: invite.fromId, accept });
    const fromId = invite.fromId;
    setInvite(null);
    if (accept) {
      // 接受后由 InviteScreen 监听 match_success 自动跳到 Game
      navigate('Invite', { autoAcceptFromId: fromId });
    }
  }

  function respondRematch(accept) {
    if (!rematch) return;
    console.log('[GlobalPopups] respondRematch', accept, rematch);
    const s = getSocket(getToken());
    s?.emit('rematch_response', {
      fromUserId: rematch.fromId,
      accept,
      gameId: rematch.gameId,
    });
    setRematch(null);
  }

  return (
    <>
      {/* 邀请对弈弹窗 */}
      <Modal transparent visible={!!invite} animationType="fade" onRequestClose={() => respondInvite(false)}>
        <View style={popup.modalBg}>
          <View style={popup.box}>
            <Ionicons name="game-controller" size={44} color={colors.gold} style={{ alignSelf: 'center' }} />
            <Text style={popup.title}>对 弈 邀 请</Text>
            <Text style={popup.text}>
              {invite?.fromUsername}（码 {invite?.fromCode}）邀请你下一局
            </Text>
            <View style={popup.actions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { console.log('[GlobalPopups] reject btn pressed'); respondInvite(false); }}
                style={[popup.btn, popup.btnCancel]}
              >
                <Text style={[popup.btnText, { color: colors.textMuted }]}>拒 绝</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { console.log('[GlobalPopups] accept btn pressed'); respondInvite(true); }}
                style={[popup.btn, popup.btnOk]}
              >
                <Text style={popup.btnText}>接 受</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 再来一局弹窗 */}
      <Modal transparent visible={!!rematch} animationType="fade" onRequestClose={() => respondRematch(false)}>
        <View style={popup.modalBg}>
          <View style={popup.box}>
            <Ionicons name="refresh-circle" size={44} color={colors.gold} style={{ alignSelf: 'center' }} />
            <Text style={popup.title}>再 来 一 局</Text>
            <Text style={popup.text}>
              {rematch?.fromUsername} 邀请你再来一局{'\n'}(10 秒内未响应将自动取消)
            </Text>
            <View style={popup.actions}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => respondRematch(false)} style={[popup.btn, popup.btnCancel]}>
                <Text style={[popup.btnText, { color: colors.textMuted }]}>拒 绝</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPress={() => respondRematch(true)} style={[popup.btn, popup.btnOk]}>
                <Text style={popup.btnText}>接 受</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 对方已离开提示 */}
      <Modal transparent visible={!!opponentLeft} animationType="fade" onRequestClose={() => setOpponentLeft(null)}>
        <View style={popup.modalBg}>
          <View style={popup.box}>
            <Ionicons name="exit-to-app" size={44} color="#FF6B6B" style={{ alignSelf: 'center' }} />
            <Text style={[popup.title, { color: '#FF6B6B' }]}>对 方 已 离 开</Text>
            <Text style={popup.text}>
              你的对手已离开对局{opponentLeft?.reason === 'disconnected' ? '(连接已断开)' : ''}
            </Text>
            <View style={popup.actions}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setOpponentLeft(null)} style={[popup.btn, popup.btnOk, { flex: 0, paddingHorizontal: 32 }]}>
                <Text style={popup.btnText}>我 知 道 了</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 好友请求弹窗 */}
      <Modal transparent visible={!!friendReq} animationType="fade" onRequestClose={() => setFriendReq(null)}>
        <View style={popup.modalBg}>
          <View style={popup.box}>
            <Ionicons name="person-add" size={44} color={colors.gold} style={{ alignSelf: 'center' }} />
            <Text style={popup.title}>好 友 申 请</Text>
            <Text style={popup.text}>
              {friendReq?.fromUsername}（码 {friendReq?.fromCode}）想加你为好友
            </Text>
            <View style={popup.actions}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setFriendReq(null)} style={[popup.btn, popup.btnCancel]}>
                <Text style={[popup.btnText, { color: colors.textMuted }]}>稍 后</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPress={() => { setFriendReq(null); navigate('Friends', { tab: 'requests' }); }} style={[popup.btn, popup.btnOk]}>
                <Text style={popup.btnText}>查 看</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 好友已接受提示 */}
      <Modal transparent visible={!!friendAccepted} animationType="fade" onRequestClose={() => setFriendAccepted(null)}>
        <View style={popup.modalBg}>
          <View style={popup.box}>
            <Ionicons name="checkmark-circle" size={44} color={colors.success} style={{ alignSelf: 'center' }} />
            <Text style={popup.title}>
              {friendAccepted?.accepted ? '已添加好友' : '对方已处理'}
            </Text>
            <Text style={popup.text}>{friendAccepted?.byUsername} 接受了你的好友请求</Text>
            <View style={popup.actions}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setFriendAccepted(null)} style={[popup.btn, popup.btnOk, { flex: 0, paddingHorizontal: 32 }]}>
                <Text style={popup.btnText}>好 的</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// 错误边界：捕获子组件渲染错误并显示出来
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('App crashed:', err, info); }
  render() {
    if (this.state.err) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0b1020', padding: 20 }}>
          <Text style={{ color: '#ff6b6b', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
            ⚠ 启动出错
          </Text>
          <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>
            {String(this.state.err && this.state.err.message ? this.state.err.message : this.state.err)}
          </Text>
          {this.state.err && this.state.err.stack ? (
            <Text style={{ color: '#aaa', fontSize: 11 }}>{String(this.state.err.stack)}</Text>
          ) : null}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

function InnerApp() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [navApi, setNavApi] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        setInitialRoute(token ? 'Match' : 'Login');
      } catch (e) {
        // 兼容 web 端 AsyncStorage 不可用的情况
        setInitialRoute('Login');
      }
    })();
    // 监听 App 状态：回到前台时维持 socket 连接
    let sub;
    try {
      sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          (async () => {
            try {
              const t = await AsyncStorage.getItem('token');
              if (t) getSocket(t);
            } catch (_) {}
          })();
        }
      });
    } catch (_) {
      sub = { remove() {} };
    }
    return () => sub && sub.remove();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgDeep, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={NavTheme}
      ref={navRef}
      onReady={() => setNavApi(navRef.current)}
    >
      <StatusBar style="light" backgroundColor={colors.bgDeep} />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: { backgroundColor: colors.bgBase },
          headerTintColor: colors.gold,
          headerTitleStyle: { fontWeight: '700', letterSpacing: 2 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bgDeep },
          animation: 'slide_from_right',
          animationDuration: 220,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: '注册' }} />
        <Stack.Screen name="Match" component={MatchScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Game" component={GameScreen} options={{ headerShown: false, headerBackVisible: false }} />
        <Stack.Screen name="Replay" component={ReplayScreen} options={{ title: '对局回放' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: '历史对局' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: '个人中心' }} />
        <Stack.Screen name="Friends" component={FriendsScreen} options={{ title: '好友' }} />
        <Stack.Screen name="SearchUser" component={SearchUserScreen} options={{ title: '添加好友' }} />
        <Stack.Screen name="Invite" component={InviteScreen} options={{ title: '邀请对弈' }} />
      </Stack.Navigator>
      {navApi && <GlobalPopups navigate={navApi.navigate} />}
    </NavigationContainer>
  );
}

export default function App() {
  // web 端需要显式给根容器一个高度，否则 flex:1 不会撑满视口
  const rootStyle = Platform.OS === 'web'
    ? { flex: 1, height: '100vh', width: '100vw', backgroundColor: colors.bgDeep }
    : { flex: 1, backgroundColor: colors.bgDeep };
  if (Platform.OS === 'web' && typeof console !== 'undefined') {
    console.log('[FiveStars] App root mounted, platform=web');
  }
  return (
    <AppErrorBoundary>
      <View style={rootStyle}>
        <InnerApp />
      </View>
    </AppErrorBoundary>
  );
}

// 关键：把 App 注册到 AppRegistry，web 端会执行 AppRegistry.runApplication
// 把 App 挂载到 <div id="root"> 上。expo-cli 在 web 模式下不会自动注入这行。
registerRootComponent(App);

const popup = {
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  box: {
    width: '100%', maxWidth: 380, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.goldDeep, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg,
  },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.sm, letterSpacing: 4 },
  text: { color: colors.textSecondary, fontSize: fontSize.small, textAlign: 'center', marginBottom: spacing.lg },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  // 按钮固定 flex:1 让 row 等分,不再被 wrapStyle 撑爆
  btn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6, minHeight: 48 },
  btnCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.goldDeep },
  btnOk: { backgroundColor: colors.gold },
  btnText: { color: colors.textOnGold, fontSize: fontSize.body, fontWeight: fontWeight.bold, letterSpacing: 4 },
};
