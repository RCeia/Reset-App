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
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import io, { Socket } from 'socket.io-client';
import { BASE_URL } from '@/constants/Config';
import { AuthContext } from '@/app/context/AuthContext'; // <--- IMPORTANTE

interface User {
  _id: string;
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
  
  // ✅ OBTEMOS O TOKEN DO CONTEXTO (Funciona na Web e Mobile)
  const { token } = useContext(AuthContext);

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  // ============================================================
  // 1. SETUP INICIAL E SOCKETS
  // ============================================================
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Se não houver token (ex: logout), não faz nada
      if (!token) return;

      try {
        // Descodificar o JWT para obter o ID do utilizador
        // (Isto funciona na Web e Mobile porque é JavaScript puro)
        const parts = token.split('.');
        const payload = JSON.parse(decodeURIComponent(escape(window.atob ? window.atob(parts[1]) : atob(parts[1]))));
        
        if (mounted) setUserId(payload.id);
      } catch (e) { 
        console.log('Erro ao ler token:', e); 
      }

      // Ligar o Socket
      socketRef.current = io(BASE_URL);

      // --- A. Ouvir Novas Mensagens ---
      socketRef.current.on('new_message', (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      });

      // --- B. Ouvir Novo Chat Criado ---
      socketRef.current.on('chat_created', (newChat: Chat) => {
        setChats((currentChats) => {
             if (currentChats.find(c => c._id === newChat._id)) return currentChats;
             return [newChat, ...currentChats];
        });
      });

      // --- C. Ouvir Chat Apagado ---
      socketRef.current.on('chat_deleted', (deletedChatId: string) => {
        setChats((currentChats) => currentChats.filter(c => c._id !== deletedChatId));

        setSelectedChat((currentSelected) => {
            if (currentSelected && currentSelected._id === deletedChatId) {
                // Alert funciona na Web, mas é básico. Serve para agora.
                Alert.alert('Aviso', 'Este chat foi encerrado pelo administrador.');
                return null;
            }
            return currentSelected;
        });
      });
    };

    init();
    return () => { mounted = false; socketRef.current?.disconnect(); };
  }, [token]); // Executa quando o token muda (ex: login)

  // Buscar Chats (API)
  useEffect(() => {
    const fetchChats = async () => {
      if (!token) return; // Só busca se tiver token

      try {
        const res = await fetch(`${BASE_URL}/chats`, {
          headers: { Authorization: `Bearer ${token}` }, // Usa o token do contexto
        });
        const data = await res.json();
        if (data.success) setChats(data.chats);
      } catch (error) { console.error("Erro fetch chats:", error); }
    };
    fetchChats();
  }, [token, userId]);

  // Entrar no Chat
  useEffect(() => {
    if (!selectedChat || !userId || !socketRef.current || !token) return;
    setMessages([]); 

    const loadChatData = async () => {
      socketRef.current?.emit('join_chat', { chatId: selectedChat._id, userId });
      try {
        const res = await fetch(`${BASE_URL}/chats/${selectedChat._id}/messages`, {
            headers: { Authorization: `Bearer ${token}` }, // Usa o token do contexto
        });
        const data = await res.json();
        if (data.success) {
            setMessages(data.messages);
            setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
        }
      } catch (error) { console.error("Erro fetch messages:", error); }
    };
    loadChatData();
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <View style={styles.headerList}>
           <Text style={[styles.headerTitle, { color: themeColors.text }]}>Mensagens</Text>
        </View>
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>
                Nenhum chat disponível.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chatRowItem, { borderBottomColor: themeColors.text + '20' }]}
              onPress={() => setSelectedChat(item)}
            >
              <View style={[styles.chatIconPlaceholder, { backgroundColor: '#007AFF' }]}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={[styles.chatRowName, { color: themeColors.text }]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  // --- MODO: DENTRO DA CONVERSA ---
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Header */}
        <View style={[styles.chatHeader, { borderBottomColor: themeColors.text + '10' }]}>
            <TouchableOpacity onPress={() => setSelectedChat(null)} style={{ padding: 5 }}>
                <Ionicons name="arrow-back" size={26} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitleChat, { color: themeColors.text }]}>{selectedChat.name}</Text>
            <View style={{ width: 26 }} />
        </View>

        {/* Lista de Mensagens */}
        <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id || Math.random().toString()}
            contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 20 }}
            renderItem={({ item }) => {
                const isMe = item.sender._id === userId;
                return (
                    <View style={[
                        styles.messageContainer, 
                        { flexDirection: isMe ? 'row-reverse' : 'row' }
                    ]}>
                        
                        {/* 🟢 AVATAR */}
                        {item.sender.avatar ? (
                             <Image 
                                source={{ uri: item.sender.avatar }} 
                                style={styles.avatarImage} 
                                resizeMode="cover"
                             />
                        ) : (
                             <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={16} color="#fff" />
                             </View>
                        )}
                        
                        {/* Conteúdo da Mensagem */}
                        <View style={{ maxWidth: '75%', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            <Text style={styles.senderName}>{item.sender.username}</Text>

                            <View style={[
                                styles.bubble,
                                { 
                                    backgroundColor: isMe ? '#007AFF' : (colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA'),
                                    borderBottomRightRadius: isMe ? 2 : 18,
                                    borderBottomLeftRadius: isMe ? 18 : 2,
                                }
                            ]}>
                                <Text style={{ color: isMe ? '#fff' : (colorScheme === 'dark' ? '#fff' : '#000'), fontSize: 16 }}>
                                    {item.text}
                                </Text>
                            </View>
                        </View>
                    </View>
                );
            }}
        />

        {/* Input */}
        <View style={[styles.inputContainer, { borderTopColor: themeColors.text + '10', backgroundColor: themeColors.background }]}>
            <TextInput
                style={[styles.textInput, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0', color: themeColors.text }]}
                placeholder="Escreva aqui..."
                placeholderTextColor="#999"
                value={newMessage}
                onChangeText={setNewMessage}
            />
            <TouchableOpacity 
                style={[styles.sendBtn, { backgroundColor: '#007AFF' }]} 
                onPress={handleSendMessage}
            >
                <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerList: { padding: 20 },
  headerTitle: { fontSize: 30, fontWeight: 'bold' },
  chatRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  chatIconPlaceholder: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  chatRowName: { fontSize: 17, fontWeight: '600' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitleChat: { fontSize: 18, fontWeight: 'bold' },
  
  messageContainer: { marginBottom: 15, alignItems: 'flex-end' }, 
  
  avatarImage: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 8 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 8, backgroundColor: '#888', justifyContent: 'center', alignItems: 'center' },
  
  senderName: { fontSize: 11, color: '#888', marginBottom: 2, marginHorizontal: 5 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  textInput: { flex: 1, height: 42, borderRadius: 21, paddingHorizontal: 15, marginRight: 10 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' }
});