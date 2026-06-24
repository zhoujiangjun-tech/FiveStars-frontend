// 对局主页面
// 顶部:对手信息卡(头像/棋子颜色/昵称/悔棋次数)
// 中部:大棋盘
// 底部:状态条(轮到我/步数)+ 操作区(悔棋/认输/退出)
// 弹窗:悔棋请求、认输确认、退出确认、rematch 邀请、对局结束
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, Modal, Dimensions,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Board from '../components/Board';
import ResultModal from '../components/ResultModal';
import PressableScale from '../components/PressableScale';
import ChatPanel, { ChatFloatingOverlay } from '../components/ChatPanel';
import EmojiPanel, { EmojiReactionLayer } from '../components/EmojiPanel';
import { colors, radius, fontSize, fontWeight, spacing } from '../theme';
import { getSocket, onGlobal } from '../services/socket';
import { getStoredUser } from '../services/api';
import { playPlace, playWin, playLose, toggleSfx, isSfxEnabled } from '../services/sound';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// 棋盘自动按可用高度适配，确保操作区不被挤出屏幕
const BOARD_PX = Math.min(SCREEN_W - 32, Math.max(260, SCREEN_H - 360));

function StoneIcon({ color, size = 18 }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color === 'black' ? '#0A0A0A' : '#F5F5F5',
        borderWidth: color === 'black' ? 1 : 1.2,
        borderColor: color === 'black' ? '#000' : 'rgba(0,0,0,0.18)',
      }}
    />
  );
}

function PlayerCard({ name, color, role, isTurn, undoCount, isMe, totalMoves, myColor }) {
  return (
    <View style={[
      styles.playerCard,
      isMe && { borderColor: colors.gold, borderWidth: 1.5 },
      !isMe && { borderColor: 'rgba(255,255,255,0.06)' },
    ]}>
      <View style={[styles.stoneWrap, { borderColor: isTurn ? colors.gold : 'transparent' }]}>
        <StoneIcon color={color} size={32} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.playerName} numberOfLines={1}>{name || '棋手'}</Text>
          {isMe && <View style={styles.mePill}><Text style={styles.mePillText}>我</Text></View>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
          <Text style={styles.playerRole}>{role}</Text>
          {isTurn && (
            <View style={styles.turnDot}>
              <Text style={styles.turnDotText}>思考中</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.undoPill}>
        <Ionicons name="arrow-undo" size={11} color={colors.gold} />
        <Text style={styles.undoPillText}>{undoCount}</Text>
      </View>
    </View>
  );
}

export default function GameScreen({ route, navigation }) {
  const { gameId, myColor, opponent } = route.params;
  const [moves, setMoves] = useState([]);
  const [currentTurn, setCurrentTurn] = useState('black');
  const [lastMove, setLastMove] = useState(null);
  const [status, setStatus] = useState('playing');
  const [bothReady, setBothReady] = useState(false);
  const [undoBlack, setUndoBlack] = useState(3);
  const [undoWhite, setUndoWhite] = useState(3);
  const [undoModal, setUndoModal] = useState(null);
  const [resignModal, setResignModal] = useState(false);
  const [exitModal, setExitModal] = useState(false);
  const [resultInfo, setResultInfo] = useState(null);
  const [rematchSent, setRematchSent] = useState(false);
  const [rematchDeclined, setRematchDeclined] = useState(false);
  const [rematchFrom, setRematchFrom] = useState(null); // { fromId, fromUsername, gameId }
  // 确认落子弹窗
  const [pendingPlace, setPendingPlace] = useState(null); // { x, y } 第一次点击的虚化位置
  // 聊天和表情
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiReactions, setEmojiReactions] = useState([]);
  const [sfxOn, setSfxOn] = useState(isSfxEnabled());
  const [floatingMessages, setFloatingMessages] = useState([]);
  // 思考倒计时
  const [turnDeadline, setTurnDeadline] = useState(null);
  const [turnSeconds, setTurnSeconds] = useState(90);
  const [tickNow, setTickNow] = useState(Date.now());
  const socketRef = useRef(null);
  const gameIdRef = useRef(gameId);
  const myIdRef = useRef(null);
  // 快速双击同一位置直接落子:记录上一次点击的位置+时间戳
  const lastTapRef = useRef({ x: -1, y: -1, t: 0 });
  const DOUBLE_TAP_MS = 1500;

  useEffect(() => {
    let unsubs = [];
    let isMounted = true;
    // 进入对局后 5 秒兜底放行,避免对方进不来导致永远无法落子
    const fallbackTimer = setTimeout(() => {
      if (isMounted) setBothReady(true);
    }, 5000);
    (async () => {
      const token = await AsyncStorage.getItem('token');
      const s = getSocket(token);
      socketRef.current = s;
      // 获取当前用户 ID
      try {
        const u = await getStoredUser();
        if (u?.id) myIdRef.current = u.id;
      } catch (_) {}
      // 进入对局后立即通知服务端"我已进入" -> 服务端开始记时,
      // 且后续这个 user 断线才会被算作"比赛中离线"去通知对手
      if (s.connected) {
        try { s.emit('join_game', { gameId: gameIdRef.current }); } catch (_) {}
      } else {
        s.once('connect', () => {
          try { s.emit('join_game', { gameId: gameIdRef.current }); } catch (_) {}
        });
      }
      // 双方都进入对局后,服务端会推送 game_ready
      s.on('game_ready', (data) => {
        if (!isMounted) return;
        if (data.gameId !== gameIdRef.current) return;
        setBothReady(true);
      });
      s.on('join_game_ack', (data) => {
        if (!isMounted) return;
        if (data.gameId !== gameIdRef.current) return;
        // 对方也已经在房间里了
        if (data.bothReady) setBothReady(true);
      });

      s.on('opponent_move', (data) => {
        if (data.gameId !== undefined && data.gameId !== gameIdRef.current) return;
        const newMove = { x: data.x, y: data.y, player: data.player };
        setMoves((prev) => [...prev, newMove]);
        setLastMove(newMove);
        setCurrentTurn(data.player === 'black' ? 'white' : 'black');
        setPendingPlace(null);
        playPlace();
      });
      // 服务端推送每回合开始（倒计时）
      s.on('turn_started', (data) => {
        if (data.gameId !== gameIdRef.current) return;
        if (data.turnSeconds) setTurnSeconds(data.turnSeconds);
        setTurnDeadline(Date.now() + (data.turnSeconds || 90) * 1000);
      });
      // 思考超时（仅提示，重新计时）
      s.on('turn_timeout', (data) => {
        if (data.gameId !== gameIdRef.current) return;
        const msg = `思考超时（${data.count}/${data.remaining + data.count}），已重新开始计时，剩余 ${data.seconds} 秒`;
        if (typeof window !== 'undefined' && window.alert) {
          window.alert('思考超时\n' + msg);
        } else {
          Alert.alert('思考超时', msg);
        }
      });
      s.on('undo_requested', (data) => {
        setUndoModal({ gameId, fromUsername: data.fromUsername });
      });
      s.on('undo_result', (data) => {
        setUndoModal(null);
        if (data.accepted) {
          const removed = data.moveRemoved;
          setMoves((prev) => {
            const idx = prev.findIndex(
              (m) => m.x === removed.x && m.y === removed.y && m.player === removed.player
            );
            if (idx >= 0) {
              const next = prev.slice(0, idx);
              setLastMove(next.length ? next[next.length - 1] : null);
              return next;
            }
            return prev;
          });
          setCurrentTurn(removed.player);
          // 同步悔棋次数
          if (removed.player === 'black') setUndoBlack((c) => Math.max(0, c - 1));
          else setUndoWhite((c) => Math.max(0, c - 1));
          Alert.alert('悔棋', '对手同意了你的悔棋');
        } else {
          Alert.alert('悔棋', '对手拒绝了你的悔棋请求');
        }
      });
      s.on('game_over', async (data) => {
        setStatus('finished');
        setRematchFrom(null);
        setRematchSent(false);
        try {
          const u = await getStoredUser();
          const myId = u?.id;
          const isWin = myId != null && data.winner === myId;
          setResultInfo({ ...data, isWin });
          if (isWin) playWin(); else playLose();
        } catch (e) {
          setResultInfo({ ...data, isWin: false });
          playLose();
        }
      });
      // ★ 用全局事件总线订阅 rematch_requested(任何时候都能收到)
      unsubs.push(onGlobal('rematch_requested', (data) => {
        console.log('[GameScreen] rematch_requested', data);
        setRematchFrom({ fromId: data.fromId, fromUsername: data.fromUsername, gameId: data.gameId });
      }));
      s.on('rematch_declined', (data) => {
        setRematchSent(false);
        setRematchDeclined(true);
        setTimeout(() => setRematchDeclined(false), 3500);
      });
      // 再来一局 10 秒超时自动拒绝
      s.on('rematch_timeout', (data) => {
        setRematchSent(false);
        setRematchFrom(null);
        const msg = `对方未在 ${data.seconds || 10} 秒内响应，再来一局已自动取消`;
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(msg);
        } else {
          Alert.alert('再来一局超时', msg);
        }
      });
      s.on('rematch_cancelled', (data) => {
        setRematchFrom(null);
      });
      s.on('match_success', (data) => {
        // rematch 同意后后端会推送新的 match_success：直接跳到新对局
        setRematchFrom(null);
        setRematchSent(false);
        setResultInfo(null);
        navigation.replace('Game', {
          gameId: data.gameId,
          myColor: data.color,
          opponent: data.opponent,
        });
      });
      s.on('error', (data) => Alert.alert('提示', data?.message || '出错了'));
      s.on('chat_message', (data) => {
        const msg = { ...data, isMe: data.fromId === myIdRef.current };
        setChatMessages((prev) => [...prev, msg]);
        // 浮动气泡
        const fid = Date.now() + Math.random();
        setFloatingMessages((prev) => [...prev, {
          ...msg, id: fid, onDone: () => setFloatingMessages((p) => p.filter((m) => m.id !== fid)),
        }]);
      });
      s.on('emoji_reaction', (data) => {
        const id = Date.now() + Math.random();
        const isFromMe = data.fromId === myIdRef.current;
        setEmojiReactions((prev) => [...prev, {
          id, emoji: data.emoji,
          side: isFromMe ? 'bottom' : 'top',
          onDone: () => setEmojiReactions((p) => p.filter((r) => r.id !== id)),
        }]);
      });
    })();
    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      const s = socketRef.current;
      if (s) {
        s.off('opponent_move');
        s.off('turn_started');
        s.off('turn_timeout');
        s.off('undo_requested');
        s.off('undo_result');
        s.off('game_over');
        s.off('rematch_declined');
        s.off('rematch_timeout');
        s.off('rematch_cancelled');
        s.off('match_success');
        s.off('error');
        s.off('game_ready');
        s.off('join_game_ack');
        s.off('chat_message');
        s.off('emoji_reaction');
      }
      unsubs.forEach((u) => { try { u && u(); } catch (_) {} });
    };
  }, []);

  const isMyTurn = status === 'playing' && currentTurn === myColor && bothReady;

  // 每秒更新倒计时显示
  useEffect(() => {
    if (status !== 'playing' || !turnDeadline) return;
    const t = setInterval(() => setTickNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status, turnDeadline]);

  const remainingSec = turnDeadline
    ? Math.max(0, Math.ceil((turnDeadline - tickNow) / 1000))
    : null;

  function onPlace(x, y) {
    if (status !== 'playing') return;
    // 不是我的回合:忽略点击，不弹确认
    if (currentTurn !== myColor) {
      return;
    }
    const now = Date.now();
    const last = lastTapRef.current;
    // 快速双击同一位置(< 1.5s):跳过虚化预览,直接落子
    if (last.x === x && last.y === y && now - last.t < DOUBLE_TAP_MS) {
      lastTapRef.current = { x: -1, y: -1, t: 0 };
      setPendingPlace(null);
      doPlace(x, y);
      return;
    }
    lastTapRef.current = { x, y, t: now };
    // 二次落子校验:第一次点击只显示虚化预览(pendingPlace),
    // 再次点击同一位置 → 实体落子;点击其他位置 → 移动虚化棋子
    if (pendingPlace && pendingPlace.x === x && pendingPlace.y === y) {
      // 第二次点同一处:真正落子
      lastTapRef.current = { x: -1, y: -1, t: 0 };
      setPendingPlace(null);
      doPlace(x, y);
      return;
    }
    // 第一次点击,或点击了不同位置 → 移动虚化棋子
    setPendingPlace({ x, y });
  }

  function doPlace(x, y) {
    const newMove = { x, y, player: myColor };
    setMoves((prev) => [...prev, newMove]);
    setLastMove(newMove);
    setCurrentTurn(myColor === 'black' ? 'white' : 'black');
    socketRef.current?.emit('make_move', { gameId, x, y });
    playPlace();
  }

  function cancelPlace() {
    setPendingPlace(null);
  }

  function onRequestUndo() {
    if (status !== 'playing') return;
    if (myColor === 'black' ? undoBlack <= 0 : undoWhite <= 0) {
      Alert.alert('提示', '悔棋次数已用完');
      return;
    }
    socketRef.current?.emit('request_undo', { gameId });
    Alert.alert('已发送', '悔棋请求已发送给对手');
  }

  function confirmResign() {
    setResignModal(false);
    socketRef.current?.emit('resign', { gameId });
  }

  function respondUndo(accepted) {
    socketRef.current?.emit('undo_response', { gameId, accepted });
    setUndoModal(null);
  }

  function confirmExit() {
    setExitModal(false);
    socketRef.current?.emit('exit_game', { gameId });
    // 本地立即跳走，等后端 game_over 推过来时 GameScreen 已被卸载
    setTimeout(() => {
      navigation.replace('Match');
    }, 100);
  }

  function requestRematch() {
    if (!socketRef.current || !gameId) return;
    console.log('[GameScreen] request_rematch emit gameId=', gameId, 'connected=', socketRef.current.connected);
    socketRef.current.emit('request_rematch', { gameId });
    setRematchSent(true);
    setRematchDeclined(false);
  }

  function respondRematch(accept) {
    if (!rematchFrom) return;
    socketRef.current?.emit('rematch_response', { fromUserId: rematchFrom.fromId, accept, gameId });
    setRematchFrom(null);
  }

  function exitGame() {
    navigation.replace('Match');
  }

  function sendChatMessage(text) {
    socketRef.current?.emit('chat_message', { gameId, text });
  }

  function sendEmoji(emoji) {
    socketRef.current?.emit('emoji_reaction', { gameId, emoji });
  }

  function handleToggleSfx() {
    const on = toggleSfx();
    setSfxOn(on);
  }

  const resultText = (() => {
    if (status !== 'finished' || !resultInfo) return '';
    if (resultInfo.isWin === true) return '★ 五星连珠，你赢了！';
    if (resultInfo.isWin === false) return '差一步，再来一局';
    return '对局结束';
  })();

  const blackName = myColor === 'black' ? '我' : opponent?.username;
  const whiteName = myColor === 'white' ? '我' : opponent?.username;
  const oppColor = myColor === 'black' ? 'white' : 'black';
  const myRole = myColor === 'black' ? '执黑 · 先行' : '执白 · 后行';
  const oppRole = myColor === 'white' ? '执黑 · 先行' : '执白 · 后行';

  return (
    <View style={styles.container}>
      {/* 顶部对手信息 */}
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <PlayerCard
          name={opponent?.username}
          color={oppColor}
          role={oppRole}
          isTurn={currentTurn !== myColor && status === 'playing'}
          undoCount={myColor === 'black' ? undoWhite : undoBlack}
          isMe={false}
          totalMoves={moves.length}
          myColor={myColor}
        />
      </View>

      {/* 棋盘 */}
      <View style={styles.boardArea}>
        <Board
          moves={moves}
          lastMove={lastMove}
          ghost={pendingPlace ? { x: pendingPlace.x, y: pendingPlace.y, color: myColor } : null}
          disabled={status !== 'playing'}
          onPlace={onPlace}
          size={BOARD_PX}
        />
        {/* 浮动聊天消息 (棋盘上虚化消失) */}
        <ChatFloatingOverlay floatingMessages={floatingMessages} />
        {/* 表情飘浮动画 */}
        <EmojiReactionLayer reactions={emojiReactions} />
        {/* 落子步骤计数 */}
        <View style={styles.moveChip}>
          <Ionicons name="grid-outline" size={12} color={colors.gold} />
          <Text style={styles.moveChipText}>第 {Math.floor(moves.length / 2) + (moves.length % 2)} 手</Text>
        </View>
        {/* 思考倒计时 */}
        {status === 'playing' && remainingSec != null && (
          <View style={[styles.timerChip, remainingSec <= 15 && { backgroundColor: 'rgba(255,107,107,0.15)', borderColor: '#FF6B6B' }]}>
            <Ionicons name="timer-outline" size={14} color={remainingSec <= 15 ? '#FF6B6B' : colors.gold} />
            <Text style={[styles.timerChipText, remainingSec <= 15 && { color: '#FF6B6B' }]}>
              {currentTurn === myColor ? '我方' : '对方'} 思考中 {remainingSec}s
            </Text>
          </View>
        )}
        {/* 虚化预览时的轻量提示条(支持取消) */}
        {!!pendingPlace && (
          <View style={styles.confirmBar}>
            <Ionicons name="location-outline" size={14} color={colors.goldBright} />
            <Text style={styles.confirmText}>
              预览位置 ({pendingPlace.x + 1}, {pendingPlace.y + 1}) · 再点一次或快速双击确认,点其它位置可调整
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={cancelPlace}
                style={[styles.confirmBtn, { backgroundColor: 'rgba(255,107,107,0.15)', borderColor: '#FF6B6B' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 底部我方信息卡 */}
      <View style={{ paddingHorizontal: spacing.md }}>
        <PlayerCard
          name="我"
          color={myColor}
          role={myRole}
          isTurn={isMyTurn}
          undoCount={myColor === 'black' ? undoBlack : undoWhite}
          isMe
          totalMoves={moves.length}
          myColor={myColor}
        />
      </View>

      {/* 操作按钮 */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onRequestUndo}
          style={[styles.actionBtn, styles.undoBtn]}
          activeOpacity={0.7}
          disabled={status !== 'playing'}
        >
          <Ionicons name="arrow-undo" size={16} color={colors.gold} />
          <Text style={[styles.actionText, { color: colors.gold }]}>悔棋</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setResignModal(true)}
          style={[styles.actionBtn, styles.resignBtn]}
          activeOpacity={0.7}
          disabled={status !== 'playing'}
        >
          <Ionicons name="flag" size={18} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff' }]}>认输</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setExitModal(true)}
          style={[styles.actionBtn, styles.exitBtn]}
          activeOpacity={0.7}
          disabled={status !== 'playing'}
        >
          <Ionicons name="exit-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.actionText, { color: colors.textMuted }]}>退出</Text>
        </TouchableOpacity>
      </View>

      {/* 快捷功能按钮 */}
      <View style={styles.quickRow}>
        <TouchableOpacity onPress={handleToggleSfx} style={[styles.quickBtn, sfxOn && styles.quickBtnActive]} activeOpacity={0.7}>
          <Ionicons name={sfxOn ? 'volume-high' : 'volume-mute'} size={14} color={sfxOn ? colors.gold : colors.textMuted} />
          <Text style={[styles.quickBtnText, sfxOn && { color: colors.gold }]}>音效</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowChat(!showChat); setShowEmoji(false); }} style={[styles.quickBtn, showChat && styles.quickBtnActive]} activeOpacity={0.7}>
          <Ionicons name="chatbubble-ellipses" size={14} color={showChat ? colors.gold : colors.textMuted} />
          <Text style={[styles.quickBtnText, showChat && { color: colors.gold }]}>聊天</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowEmoji(!showEmoji); setShowChat(false); }} style={[styles.quickBtn, showEmoji && styles.quickBtnActive]} activeOpacity={0.7}>
          <Ionicons name="happy" size={14} color={showEmoji ? colors.gold : colors.textMuted} />
          <Text style={[styles.quickBtnText, showEmoji && { color: colors.gold }]}>表情</Text>
        </TouchableOpacity>
      </View>

      {/* 聊天面板 */}
      <ChatPanel
        messages={chatMessages}
        onSend={sendChatMessage}
        visible={showChat}
      />

      {/* 表情面板 */}
      <EmojiPanel
        onEmoji={sendEmoji}
        visible={showEmoji}
      />

      {/* 悔棋请求弹窗 */}
      <Modal transparent visible={!!undoModal} animationType="fade" onRequestClose={() => setUndoModal(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIcon, { borderColor: colors.gold }]}>
              <Ionicons name="help-circle" size={36} color={colors.gold} />
            </View>
            <Text style={styles.modalTitle}>悔棋请求</Text>
            <Text style={styles.modalText}>
              {undoModal?.fromUsername || '对手'} 请求悔棋，是否同意？
            </Text>
            <View style={styles.modalActions}>
              <PressableScale onPress={() => respondUndo(false)} style={[styles.modalBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger }]}>
                <Text style={[styles.modalBtnText, { color: colors.danger }]}>拒绝</Text>
              </PressableScale>
              <PressableScale onPress={() => respondUndo(true)} style={[styles.modalBtn, { backgroundColor: colors.success }]}>
                <Text style={styles.modalBtnText}>同意</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* 认输确认弹窗 */}
      <Modal transparent visible={resignModal} animationType="fade" onRequestClose={() => setResignModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIcon, { borderColor: colors.danger }]}>
              <Ionicons name="warning" size={36} color={colors.danger} />
            </View>
            <Text style={styles.modalTitle}>确认认输</Text>
            <Text style={styles.modalText}>认输后本局将直接判负，确定要继续吗？</Text>
            <View style={styles.modalActions}>
              <PressableScale onPress={() => setResignModal(false)} style={[styles.modalBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.goldDeep }]}>
                <Text style={[styles.modalBtnText, { color: colors.gold }]}>取消</Text>
              </PressableScale>
              <PressableScale onPress={confirmResign} style={[styles.modalBtn, { backgroundColor: colors.danger }]}>
                <Text style={styles.modalBtnText}>认输</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* 退出对弈确认弹窗 */}
      <Modal transparent visible={exitModal} animationType="fade" onRequestClose={() => setExitModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIcon, { borderColor: colors.textMuted }]}>
              <Ionicons name="exit-outline" size={36} color={colors.textMuted} />
            </View>
            <Text style={styles.modalTitle}>退出对弈</Text>
            <Text style={styles.modalText}>退出将直接判负给对手，确定要退出当前对局吗？</Text>
            <View style={styles.modalActions}>
              <PressableScale onPress={() => setExitModal(false)} style={[styles.modalBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.goldDeep }]}>
                <Text style={[styles.modalBtnText, { color: colors.gold }]}>继续对局</Text>
              </PressableScale>
              <PressableScale onPress={confirmExit} style={[styles.modalBtn, { backgroundColor: '#555' }]}>
                <Text style={styles.modalBtnText}>确认退出</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* 对局结束弹窗 —— 内嵌"再来一局"邀请交互 */}
      <ResultModal
        visible={!!resultInfo}
        isWin={resultInfo?.isWin}
        reason={resultInfo?.reason}
        onHome={exitGame}
        onReplay={() => navigation.navigate('Replay', { gameId })}
        onRequestRematch={requestRematch}
        rematchSent={rematchSent}
        rematchDeclined={rematchDeclined}
        rematchIncoming={rematchFrom}
        onAcceptRematch={() => respondRematch(true)}
        onDeclineRematch={() => respondRematch(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep, width: '100%', maxWidth: 520, alignSelf: 'center' },

  // 玩家卡
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  stoneWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  playerName: {
    color: colors.textPrimary, fontSize: 15, fontWeight: '800',
    letterSpacing: 1, flexShrink: 1,
  },
  playerRole: {
    color: colors.textMuted, fontSize: 11, letterSpacing: 1,
  },
  mePill: {
    marginLeft: 6,
    paddingHorizontal: 6, paddingVertical: 1,
    backgroundColor: colors.gold, borderRadius: radius.pill,
  },
  mePillText: { color: colors.textOnGold, fontSize: 10, fontWeight: '800' },
  turnDot: {
    marginLeft: 8,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 1,
    backgroundColor: 'rgba(127,219,255,0.12)',
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: 'rgba(127,219,255,0.3)',
  },
  turnDotText: { color: '#7FDBFF', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  undoPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(212,165,116,0.1)',
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.goldDeep,
  },
  undoPillText: { color: colors.gold, fontSize: 11, fontWeight: '700', marginLeft: 3 },

  // 棋盘
  boardArea: { alignItems: 'center', marginTop: 4, marginBottom: 4, position: 'relative' },
  moveChip: {
    position: 'absolute', top: 6, right: 8,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(212,165,116,0.1)',
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.goldDeep,
  },
  moveChipText: { color: colors.gold, fontSize: 11, fontWeight: '700', marginLeft: 3, letterSpacing: 1 },
  timerChip: {
    position: 'absolute', top: 6, left: 8,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(212,165,116,0.1)',
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.goldDeep,
  },
  timerChipText: { color: colors.gold, fontSize: 11, fontWeight: '700', marginLeft: 3, letterSpacing: 1 },

  // 落子确认条
  confirmBar: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 52, 96, 0.9)',
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.gold,
    paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'stretch',
  },
  confirmText: { color: colors.text, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  confirmActions: { flexDirection: 'row' },
  confirmBtn: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },

  // 操作区
  actions: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 4,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: radius.md, marginHorizontal: 4,
    backgroundColor: colors.bgCard,
  },
  undoBtn: { borderWidth: 1, borderColor: colors.goldDeep },
  resignBtn: {
    flex: 1.4,
    backgroundColor: colors.danger,
    borderWidth: 0,
    shadowColor: colors.danger,
    shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
    elevation: 6,
  },
  exitBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionText: { marginLeft: 4, fontSize: 13, fontWeight: '700', letterSpacing: 2 },

  // 快捷功能
  quickRow: {
    flexDirection: 'row', justifyContent: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 2,
  },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, marginHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  quickBtnActive: {
    borderColor: colors.goldDeep,
    backgroundColor: 'rgba(212,165,116,0.1)',
  },
  quickBtnText: {
    color: colors.textMuted, fontSize: 10, fontWeight: '700', marginLeft: 4, letterSpacing: 1,
  },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalBox: {
    width: '82%', maxWidth: 360, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.goldDeep, padding: spacing.lg,
  },
  modalIcon: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2,
    backgroundColor: 'rgba(212,165,116,0.06)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary, fontSize: 18, fontWeight: '800',
    textAlign: 'center', marginBottom: spacing.sm, letterSpacing: 4,
  },
  modalText: {
    color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: spacing.lg,
    letterSpacing: 1, lineHeight: 20,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', marginHorizontal: 6 },
  modalBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
});
