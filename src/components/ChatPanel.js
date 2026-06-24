// 聊天面板 - 可编辑对话，双方可见
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

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
  container: {
    backgroundColor: colors.bgBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    maxHeight: 180,
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
  list: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
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