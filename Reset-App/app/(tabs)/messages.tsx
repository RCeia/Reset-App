import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as SecureStore from 'expo-secure-store';
import io from 'socket.io-client';

import { BASE_URL } from '@/constants/Config';

interface User {
  username: string;
  avatar: string;
}

interface Chat {
  _id: string;
  name: string;
}

interface Message {
  id: string;
  chatId: string;
  text: string;
  createdAt: string;
  sender: User;
}

export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const socketRef = useRef<any>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch userId from token
  useEffect(() => {
    const fetchUser = async () => {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;
      // decode token to get userId
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserId(payload.id);
    };
    fetchUser();
  }, []);

  // Connect socket
  useEffect(() => {
    socketRef.current = io(BASE_URL);

    socketRef.current.on('connect', () => {
      console.log('Socket connected', socketRef.current.id);
    });

    socketRef.current.on('new_message', (msg: Message) => {
      if (selectedChat && msg.chatId === selectedChat._id) {
        setMessages(prev => [...prev, msg]);
        listRef.current?.scrollToEnd({ animated: true });
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [selectedChat]);

  // Fetch chats
  useEffect(() => {
    const fetchChats = async () => {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;

      const res = await fetch(`${BASE_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setChats(data.chats);
    };
    fetchChats();
  }, []);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;

      const res = await fetch(`${BASE_URL}/chats/${selectedChat._id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setMessages(data.messages);

      // join chat room in socket
      socketRef.current.emit('join_chat', { chatId: selectedChat._id, userId });
    };
    fetchMessages();
  }, [selectedChat, userId]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat || !userId) return;

    const payload = {
      chatId: selectedChat._id,
      userId,
      text: newMessage,
    };
    socketRef.current.emit('send_message', payload);
    setNewMessage('');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Chat List */}
      <View style={styles.chatList}>
        <FlatList
          data={chats}
          keyExtractor={item => item._id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.chatButton,
                { backgroundColor: selectedChat?._id === item._id ? themeColors.tint : '#ccc' },
              ]}
              onPress={() => setSelectedChat(item)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 10 }}
        renderItem={({ item }) => (
          <View style={styles.messageRow}>
            {item.sender.avatar ? (
              <Image source={{ uri: item.sender.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: '#888' }]} />
            )}
            <View style={styles.messageContent}>
              <Text style={[styles.username, { color: themeColors.text }]}>
                {item.sender.username}
              </Text>
              <Text style={[styles.messageText, { color: themeColors.text }]}>{item.text}</Text>
            </View>
          </View>
        )}
      />

      {/* Input */}
      {selectedChat && (
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { borderColor: themeColors.tint, color: themeColors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={themeColors.text + '66'}
            value={newMessage}
            onChangeText={setNewMessage}
          />
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: themeColors.tint }]} onPress={handleSendMessage}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatList: { paddingVertical: 10 },
  chatButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  messageRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  messageContent: { maxWidth: '80%' },
  username: { fontWeight: 'bold', marginBottom: 2 },
  messageText: { fontSize: 16 },
  inputRow: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8 },
  sendButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginLeft: 5 },
});
