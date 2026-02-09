import React, { useEffect, useState, useRef, useContext } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import io, { Socket } from 'socket.io-client';
import { BASE_URL } from '@/constants/Config';
import { AuthContext } from '@/app/context/AuthContext';

// --- CORES OFICIAIS RESET ---
const RESET_COLORS = {
  primary: '#fd151b',    // Vermelho
  secondary: '#ffb30f',  // Amarelo
  typography: '#1e3572', // Azul Escuro
  whiteAlt: '#edeff1',
  blackAlt: '#0d160b',
  darkBlue: '#152655'
};

interface User { _id: string; username: string; avatar: string; }
interface Chat { _id: string; name: string; avatar?: string; }
interface Message { id: string; chatId: string; text: string; createdAt: string; sender: User; }

export default function MessagesScreen() {
  const { token } = useContext(AuthContext);

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  // --- 1. SETUP E SOCKETS ---
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!token) return;
      try {
        const parts = token.split('.');
        const payload = JSON.parse(decodeURIComponent(escape(window.atob ? window.atob(parts[1]) : atob(parts[1]))));
        if (mounted) setUserId(payload.id);
      } catch (e) { console.log('Erro token:', e); }

      socketRef.current = io(BASE_URL);

      socketRef.current.on('new_message', (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socketRef.current.on('chat_created', (newChat: Chat) => {
        setChats((curr) => {
             if (curr.find(c => c._id === newChat._id)) return curr;
             return [newChat, ...curr];
        });
      });

      socketRef.current.on('chat_deleted', (id: string) => {
        setChats((curr) => curr.filter(c => c._id !== id));
        setSelectedChat((curr) => {
            if (curr && curr._id === id) {
                Alert.alert('Aviso', 'Chat encerrado.');
                return null;
            }
            return curr;
        });
      });
    };
    init();
    return () => { mounted = false; socketRef.current?.disconnect(); };
  }, [token]);

  // Buscar Chats
  useEffect(() => {
    const fetchChats = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${BASE_URL}/chats`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setChats(data.chats);
      } catch (error) { console.error("Erro chats:", error); }
    };
    fetchChats();
  }, [token, userId]);

  // Entrar no Chat
  useEffect(() => {
    if (!selectedChat || !userId || !socketRef.current || !token) return;
    setMessages([]); 
    const loadData = async () => {
      socketRef.current?.emit('join_chat', { chatId: selectedChat._id, userId });
      try {
        const res = await fetch(`${BASE_URL}/chats/${selectedChat._id}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
            setMessages(data.messages);
            setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
        }
      } catch (error) { console.error("Erro msgs:", error); }
    };
    loadData();
  }, [selectedChat, userId, token]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat || !userId) return;
    const payload = { chatId: selectedChat._id, userId, text: newMessage };
    socketRef.current?.emit('send_message', payload);
    setNewMessage('');
  };

  // --- MODO: LISTA DE CHATS ---
  if (!selectedChat) {
    return (
      <SafeAreaView style={styles.containerDark}>
        <View style={styles.headerList}>
           <Text style={styles.headerTitle}>MENSAGENS</Text>
        </View>
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#aaa', fontFamily: 'NotoSans-Light' }}>
                Nenhum chat disponível.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatRowItem} onPress={() => setSelectedChat(item)}>
              <Image source={require('@/assets/images/reset-logo-reduced.png')} style={styles.groupAvatar} resizeMode="contain" />
              <Text style={styles.chatRowName}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={20} color={RESET_COLORS.secondary} />
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  // --- MODO: DENTRO DA CONVERSA ---
  return (
    <View style={styles.containerDark}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: RESET_COLORS.darkBlue }}>
        <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setSelectedChat(null)} style={{ padding: 5 }}>
                <Ionicons name="arrow-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitleChat}>{selectedChat.name}</Text>
            <Image source={require('@/assets/images/reset-logo-reduced.png')} style={{ width: 30, height: 30, marginLeft: 10 }} resizeMode="contain" />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} 
      >
        <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id || Math.random().toString()}
            contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 20 }}
            style={{ flex: 1 }}
            renderItem={({ item }) => {
                const isMe = item.sender._id === userId;
                return (
                    <View style={[styles.messageContainer, { flexDirection: isMe ? 'row-reverse' : 'row' }]}>
                        
                        <Image 
                            source={item.sender.avatar ? { uri: item.sender.avatar } : require('@/assets/images/defaultAvatar.jpg')} 
                            style={styles.userAvatarImage} 
                            resizeMode="cover" 
                        />
                        
                        <View style={{ maxWidth: '75%', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            <Text style={styles.senderName}>{item.sender.username}</Text>
                            <View style={[styles.bubble, { 
                                    backgroundColor: isMe ? RESET_COLORS.secondary : '#2C2C2E', 
                                    borderBottomRightRadius: isMe ? 2 : 18,
                                    borderBottomLeftRadius: isMe ? 18 : 2,
                                }]}>
                                <Text style={{ color: isMe ? RESET_COLORS.typography : '#FFF', fontSize: 16, fontFamily: 'NotoSans-Light' }}>{item.text}</Text>
                            </View>
                        </View>
                    </View>
                );
            }}
        />

        <View style={styles.inputContainer}>
            <TextInput
                style={styles.textInput}
                placeholder="Escreva aqui..."
                placeholderTextColor="#999"
                value={newMessage}
                onChangeText={setNewMessage}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                <Ionicons name="send" size={20} color={RESET_COLORS.typography} />
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      
      {Platform.OS === 'ios' && <SafeAreaView edges={['bottom']} style={{ backgroundColor: RESET_COLORS.darkBlue }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  containerDark: { flex: 1, backgroundColor: RESET_COLORS.typography }, 
  
  headerList: { padding: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontSize: 28, fontFamily: 'Archivo-Black', color: '#FFF', textTransform: 'uppercase', letterSpacing: 1 },
  chatRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, backgroundColor: RESET_COLORS.darkBlue, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  groupAvatar: { width: 45, height: 45, marginRight: 15, borderRadius: 22.5, backgroundColor: '#FFF', borderWidth: 1, borderColor: RESET_COLORS.secondary },
  chatRowName: { fontSize: 18, flex: 1, color: '#FFF', fontFamily: 'Archivo-SemiBold' },

  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: RESET_COLORS.darkBlue },
  headerTitleChat: { fontSize: 20, fontFamily: 'Archivo-Black', color: RESET_COLORS.secondary, textTransform: 'uppercase', flex: 1, textAlign: 'center' },
  
  messageContainer: { marginBottom: 15, alignItems: 'flex-end' }, 
  userAvatarImage: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 8, borderWidth: 1, borderColor: RESET_COLORS.secondary },
  senderName: { fontSize: 10, color: '#ccc', marginBottom: 2, marginHorizontal: 5, fontFamily: 'Archivo-SemiBold', opacity: 0.8 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, elevation: 1 },
  
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 10, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: RESET_COLORS.darkBlue,
  },
  textInput: { flex: 1, height: 45, borderRadius: 25, paddingHorizontal: 20, marginRight: 10, backgroundColor: '#FFF', color: '#000', fontFamily: 'NotoSans-Light' },
  
  // ALTERAÇÃO AQUI: Adicionado paddingLeft: 3 para corrigir o centro ótico do ícone
  sendBtn: { 
    width: 45, height: 45, borderRadius: 22.5, 
    justifyContent: 'center', alignItems: 'center', 
    backgroundColor: RESET_COLORS.secondary, 
    elevation: 3,
    paddingLeft: 3 // <--- Nudge para a direita
  }
});