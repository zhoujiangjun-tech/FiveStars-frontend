// HTTP API 客户端封装
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

const DEFAULT_TIMEOUT_MS = 15000;

async function request(path, { method = 'GET', body, auth = true, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await AsyncStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${config.API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e && (e.name === 'AbortError' || /aborted/i.test(String(e.message)))) {
      throw new Error('请求超时，请检查后端服务是否启动 (端口 4800)');
    }
    throw new Error(`网络错误：${e && e.message ? e.message : e}`);
  }
  clearTimeout(timer);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.error || `请求失败 (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  // 认证
  register: (username, password) =>
    request('/api/auth/register', { method: 'POST', body: { username, password }, auth: false }),
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: { username, password }, auth: false }),

  // 用户
  me: () => request('/api/user/me'),

  // 对局
  myGames: () => request('/api/games/my'),
  gameDetail: (id) => request(`/api/games/${id}`),
  userStats: () => request('/api/user/stats'),

  // 好友
  searchUser: (code) => request(`/api/users/search?code=${encodeURIComponent(code)}`),
  sendFriendRequest: ({ code, toUserId }) =>
    request('/api/friends/request', { method: 'POST', body: { code, toUserId } }),
  friendRequests: () => request('/api/friends/requests'),
  respondFriend: (id, accept) =>
    request('/api/friends/respond', { method: 'POST', body: { id, accept } }),
  friends: () => request('/api/friends'),
  removeFriend: (id) => request(`/api/friends/${id}`, { method: 'DELETE' }),
};

export async function saveAuth(token, user) {
  await AsyncStorage.setItem('token', token);
  // 存储时合并 friendCode 字段（兼容旧版只有 id/username）
  await AsyncStorage.setItem('user', JSON.stringify({ ...user, friendCode: user.friendCode }));
}

export async function clearAuth() {
  await AsyncStorage.multiRemove(['token', 'user']);
}

export async function getStoredUser() {
  const u = await AsyncStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export async function getToken() {
  return AsyncStorage.getItem('token');
}
