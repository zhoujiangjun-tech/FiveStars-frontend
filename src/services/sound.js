// 音效服务 - 背景音乐、落子音效、胜负音效
import { Audio } from 'expo-av';

let bgMusic = null;
let musicEnabled = true;
let sfxEnabled = true;

// 生成简单 WAV 音效 (base64)
function generateToneWav(frequency, durationMs, sampleRate = 8000) {
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  // WAV header
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  // PCM data
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // 音量衰减
    const envelope = Math.max(0, 1 - i / numSamples * 1.2);
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.4;
    view.setInt16(44 + i * 2, Math.floor(sample * 32767), true);
  }
  return buffer;
}

function wavToUri(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return `data:audio/wav;base64,${base64}`;
}

// 预生成音效
const placeWav = wavToUri(generateToneWav(800, 80));
const winWav = wavToUri(generateToneWav(523, 150));
const loseWav = wavToUri(generateToneWav(200, 250));

// 初始化 Audio
async function ensureAudioReady() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch (_) {}
}

// 播放音效
async function playSfx(wavUri) {
  if (!sfxEnabled) return;
  try {
    await ensureAudioReady();
    const { sound } = await Audio.Sound.createAsync(
      { uri: wavUri },
      { shouldPlay: true, volume: 0.6 }
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (_) {}
}

// 落子音效
export async function playPlace() {
  await playSfx(placeWav);
}

// 胜利音效
export async function playWin() {
  await playSfx(winWav);
}

// 失败音效
export async function playLose() {
  await playSfx(loseWav);
}

// 背景音乐
export async function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (!musicEnabled && bgMusic) {
    try { await bgMusic.stopAsync(); await bgMusic.unloadAsync(); } catch (_) {}
    bgMusic = null;
  }
  return musicEnabled;
}

export async function startMusic() {
  if (!musicEnabled || bgMusic) return;
  try {
    await ensureAudioReady();
    // 简单的背景音: 低频循环
    const bgBuffer = generateToneWav(220, 2000);
    const bgUri = wavToUri(bgBuffer);
    const { sound } = await Audio.Sound.createAsync(
      { uri: bgUri },
      { shouldPlay: true, isLooping: true, volume: 0.15 }
    );
    bgMusic = sound;
  } catch (_) {}
}

export async function stopMusic() {
  if (bgMusic) {
    try { await bgMusic.stopAsync(); await bgMusic.unloadAsync(); } catch (_) {}
    bgMusic = null;
  }
}

export function isMusicEnabled() { return musicEnabled; }
export function isSfxEnabled() { return sfxEnabled; }
export function toggleSfx() { sfxEnabled = !sfxEnabled; return sfxEnabled; }