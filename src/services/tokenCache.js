// 简单的 token 缓存,避免每次创建 socket 都从 AsyncStorage 读
import AsyncStorage from '@react-native-async-storage/async-storage';

let _token = null;
let _loaded = false;

export async function loadToken() {
  if (_loaded) return _token;
  try {
    _token = await AsyncStorage.getItem('token');
  } catch (_) {
    _token = null;
  }
  _loaded = true;
  return _token;
}

export function getToken() {
  return _token;
}

export function setToken(t) {
  _token = t;
  _loaded = true;
}

export function clearToken() {
  _token = null;
  _loaded = false;
}
