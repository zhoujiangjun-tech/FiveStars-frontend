// Socket.io 客户端单例 + 全局事件总线
import { io } from 'socket.io-client';
import { getToken } from './tokenCache';
import config from '../config';

let socket = null;
// 全局事件订阅:避免每次 mount/unmount 漏掉事件
const globalListeners = new Map(); // event -> Set<fn>

export function getSocket(tokenOverride) {
  const targetToken = tokenOverride !== undefined ? tokenOverride : getToken();
  // 同一 token 复用同一 socket,即使还没 connected(避免 destroy 旧监听器)
  if (socket && socket.__token === targetToken) {
    return socket;
  }
  // token 不同才重建
  if (socket) {
    try { socket.removeAllListeners(); } catch (e) {}
    try { socket.disconnect(); } catch (e) {}
    socket = null;
  }
  // 优先用 override,否则从缓存拿
  const token = tokenOverride || getToken();
  socket = io(config.SOCKET_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    upgrade: true,
    rememberUpgrade: false,
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 3000,
    timeout: 8000,
    forceNew: true,
  });
  socket.__token = token;
  socket.on('connect_error', (err) => {
    console.log('[socket] connect_error', err.message);
  });
  socket.on('connect', () => {
    console.log('[socket] connected, id=', socket.id);
  });
  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected', reason);
  });
  return socket;
}

export function closeSocket() {
  if (socket) {
    try { socket.disconnect(); } catch (e) {}
    socket = null;
  }
  globalListeners.clear();
}

// 全局订阅:注册一次,直到 closeSocket 才移除
// 如果 socket 还没建立,先用缓存里的 token 创建一个
export function onGlobal(event, fn) {
  let s = socket;
  if (!s) {
    const token = getToken();
    if (token) s = getSocket(token);
  }
  if (!s) return () => {};
  if (!globalListeners.has(event)) {
    globalListeners.set(event, new Set());
    s.on(event, (...args) => {
      const set = globalListeners.get(event);
      if (set) set.forEach((cb) => { try { cb(...args); } catch (_) {} });
    });
  }
  globalListeners.get(event).add(fn);
  return () => {
    const set = globalListeners.get(event);
    if (set) set.delete(fn);
  };
}
