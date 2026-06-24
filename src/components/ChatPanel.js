// 聊天面板 + 浮动消息气泡 (棋盘上虚化消失)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

// 单条浮动消息气泡 (棋盘上出现后虚化消失)
function FloatingBubble({ msg, onDone }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 4000,
        delay: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -30,
        duration: 6000,
        useNativeDriver: true,
      }),
    ]).start(() => onDone && onDone());
  }, []);

  const isMe = msg.isMe;

  return (
    <Animated.View
      style={[
        styles.floatBubble,
        isMe ? styles.floatBubbleRight : styles.floatBubbleLeft,
        { opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.floatBubbleName} numberOfLines={1}>
        {isMe ? '我' : msg.fromUsername}
      </Text>
      <Text style={styles.floatBubbleText} numberOfLines={2}>{msg.text}</Text>
    </Animated.View>
  );
}

// 浮动消息层
export function ChatFloatingOverlay({ floatingMessages }) {
  return (
    <View style={styles.floatLayer} pointerEvents="none">
      {floatingMessages.map((m) => (
        <FloatingBubble key={m.id} msg={m} onDone={m.onDone} />
      ))}
    </View>
  );
}

// 消息气泡
function ChatBubble({ msg, isMe }) {
  return (
    <View style={[styles.bubbleWrap, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isMe && <Text style={styles.bubbleName} numberOfLines={1}>{msg.fromUsername}</Text>}
      <View style={[styles.bubble, isMe ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isMe && { color: '#fff' }]}>{msg.text}</Text>
      </View>
    </View>
  );
}

// 聊天面板
export default function ChatPanel({ messages, onSend, visible }) {
  const [input, setInput] = useState('');
  const flatRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0 && flatRef.current) {
      setTimeout(() => flatRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  function handleSend() {
    const txt = input.trim();
    if (!txt) return;
    onSend(txt);
    setInput('');
  }

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Ionicons name="chatbubble-ellipses" size={14} color={colors.gold} />
        <Text style={styles.headerText}>对局聊天</Text>
        <Text style={styles.headerCount}>{messages.length} 条</Text>
      </View>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <ChatBubble msg={item} isMe={!!item.isMe} />}
        style={styles.list}
        contentContainerStyle={{ paddingVertical: 6 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>暂无消息，输入内容开始聊天</Text>
        }
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="输入消息..."
          placeholderTextColor={colors.textMuted}
          maxLength={200}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.7}>
          <Ionicons name="send" size={16} color={colors.textOnGold} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // 浮动气泡
  floatLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 99,
  },
  floatBubble: {
    position: 'absolute',
    maxWidth: '70%',
    backgroundColor: 'rgba(15, 52, 96, 0.92)',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,165,116,0.4)',
  },
  floatBubbleLeft: {
    top: '18%',
    left: 12,
  },
  floatBubbleRight: {
    bottom: '22%',
    right: 12,
  },
  floatBubbleName: {
    color: colors.gold, fontSize: 9, fontWeight: '700', marginBottom: 2,
  },
  floatBubbleText: {
    color: colors.textPrimary, fontSize: 13,
  },

  // 聊天面板
  container: {
    backgroundColor: colors.bgBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    maxHeight: 220,
    marginHorizontal: spacing.md,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerText: {
    color: colors.gold, fontSize: 11, fontWeight: '700', marginLeft: 4, letterSpacing: 1,
  },
  headerCount: {
    color: colors.textMuted, fontSize: 10, marginLeft: 'auto',
  },
  list: {
    flex: 1,
    minHeight: 40,
    maxHeight: 140,
    paddingHorizontal: 8,
  },
  emptyText: {
    color: colors.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: 10,
  },
  bubbleWrap: {
    marginVertical: 2,
    maxWidth: '80%',
  },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  bubbleName: {
    color: colors.textMuted, fontSize: 9, marginBottom: 1, marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm,
  },
  bubbleMine: {
    backgroundColor: colors.goldDeep,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 2,
  },
  bubbleText: {
    color: colors.textPrimary, fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 6,
    color: colors.textPrimary, fontSize: 12,
  },
  sendBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 6,
  },
});