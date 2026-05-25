import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { Spacing } from '@/constants/theme';

type Message = {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

export default function SupportChatScreen() {
  const theme = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<'open' | 'resolved'>('open');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    let subscriptionChannel: any = null;

    async function initChat() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !active) return;
        setUserId(user.id);

        const { data: profile } = await supabase
          .from('driver_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile || !active) return;

        let { data: room } = await supabase
          .from('chat_rooms')
          .select('id, status')
          .eq('driver_id', profile.id)
          .maybeSingle();

        if (!room && active) {
          const { data: newRoom } = await supabase
            .from('chat_rooms')
            .insert({ driver_id: profile.id, status: 'open' })
            .select('id, status')
            .single();
          room = newRoom;
        }

        if (room && active) {
          setRoomId(room.id);
          setRoomStatus(room.status as 'open' | 'resolved');

          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('room_id', room.id)
            .order('created_at', { ascending: true });

          if (active) {
            setMessages(msgs ?? []);
          }

          subscriptionChannel = supabase
            .channel(`room_messages_${room.id}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `room_id=eq.${room.id}`,
              },
              (payload) => {
                const newMsg = payload.new as Message;
                if (active) {
                  setMessages((prev) => {
                    if (prev.some((m) => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                  });
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_rooms',
                filter: `id=eq.${room.id}`,
              },
              (payload) => {
                const updatedRoom = payload.new as { status: string };
                if (active) {
                  setRoomStatus(updatedRoom.status as 'open' | 'resolved');
                }
              }
            )
            .subscribe();
        }
      } catch (err) {
        console.error('Error initializing support chat:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initChat();

    return () => {
      active = false;
      if (subscriptionChannel) {
        supabase.removeChannel(subscriptionChannel);
      }
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  async function handleSend() {
    if (!inputText.trim() || !roomId || !userId) return;

    const currentText = inputText.trim();
    setInputText('');

    // Optimistically add the message to the list immediately
    const tempMsgId = Math.random().toString(36).substring(7);
    const tempMsg: Message = {
      id: tempMsgId,
      room_id: roomId,
      sender_id: userId,
      message: currentText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      if (roomStatus === 'resolved') {
        await supabase
          .from('chat_rooms')
          .update({ status: 'open' })
          .eq('id', roomId);
        setRoomStatus('open');
      }

      const { data: newMsg, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: userId,
          message: currentText,
        })
        .select()
        .single();

      if (error) throw error;

      if (newMsg) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsgId ? (newMsg as Message) : m))
        );
      }
    } catch (err) {
      console.error('Failed to send support message:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempMsgId));
      setInputText(currentText);
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.background }]}>
        <ThemedText themeColor="textSecondary">Loading chat thread...</ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.root}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.banner, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.border }]}>
          <View style={styles.bannerRow}>
            <View style={[styles.dot, { backgroundColor: roomStatus === 'open' ? theme.primary : theme.textSecondary }]} />
            <ThemedText style={styles.bannerTitle}>
              {roomStatus === 'open' ? 'Support Team Connected' : 'Compliance Session Closed'}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.bannerCopy}>
            Our back-office compliance and operations team typically replies within a few minutes.
          </ThemedText>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
              <ThemedText style={styles.emptyText} themeColor="textSecondary">
                Send a message to our support team to get help with your compliance profile or active zone passes.
              </ThemedText>
            </View>
          ) : (
            messages.map((item) => {
              const isDriver = item.sender_id === userId;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.bubbleContainer,
                    isDriver ? styles.driverBubbleAlign : styles.agentBubbleAlign,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isDriver
                        ? [styles.driverBubble, { backgroundColor: theme.primary }]
                        : [styles.agentBubble, { backgroundColor: theme.backgroundElement, borderColor: theme.border }],
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.bubbleText,
                        { color: isDriver ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {item.message}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </ThemedText>
                </View>
              );
            })
          )}
        </ScrollView>

        <View
          style={[
            styles.inputPanel,
            {
              backgroundColor: theme.backgroundElement,
              borderTopColor: theme.border,
              paddingBottom: Platform.OS === 'ios' ? Spacing.two : Spacing.three,
            },
          ]}
        >
          <TextInput
            placeholder="Type your message..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim()}
            style={[
              styles.sendButton,
              { backgroundColor: theme.primary, opacity: inputText.trim() ? 1 : 0.6 },
            ]}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  dot: { width: 8, height: 8, borderRadius: 999 },
  bannerTitle: { fontSize: 13, fontWeight: '700' },
  bannerCopy: { fontSize: 11, marginTop: Spacing.half },
  scrollContent: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.four },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    paddingHorizontal: Spacing.four,
    lineHeight: 18,
  },
  bubbleContainer: { maxWidth: '75%', gap: Spacing.half },
  driverBubbleAlign: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  agentBubbleAlign: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  driverBubble: {
    borderTopRightRadius: 2,
  },
  agentBubble: {
    borderTopLeftRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 9, paddingHorizontal: Spacing.one },
  inputPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
