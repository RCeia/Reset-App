import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons'; 
import * as SecureStore from 'expo-secure-store';
import io from 'socket.io-client';
import { BASE_URL } from '@/constants/Config';

const RESET_THEME = {
  primaryRed: '#fd151b',
  secondaryYellow: '#ffb30f',
  typoBlue: '#1e3572',
  whiteAlt: '#edeff1',
  blackAlt: '#0d160b',
};

export default function SocialScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    loadPosts();
    socketRef.current = io(BASE_URL);
    
    socketRef.current.on('new_post', (newPost: any) => {
        setPosts(prev => [newPost, ...prev]);
    });

    socketRef.current.on('post_liked', (p: any) => {
      setPosts(prev => prev.map(post => post.id === p.id ? { ...post, likes: p.likes } : post));
    });

    socketRef.current.on('post_commented', () => loadPosts());
    
    return () => socketRef.current?.disconnect();
  }, []);

  const loadPosts = async () => {
    const token = await SecureStore.getItemAsync('token');
    try {
      const res = await fetch(`${BASE_URL}/posts`, { 
          headers: { Authorization: `Bearer ${token}` } 
      });
      const text = await res.text();
      try {
          const data = JSON.parse(text);
          if (data.success) {
              setPosts(data.posts.map((p: any) => ({ ...p, newComment: '' })));
          }
      } catch (e) {
          console.log(`Erro 404: A rota GET /posts não existe no backend. Status: ${res.status}`);
      }
    } catch (err) { 
        console.log("Erro de rede ao carregar posts:", err);
    }
  };

  const getAvatar = (url: string | null, name: string) => {
    if (url && url.trim() !== '' && url !== 'undefined') return { uri: url };
    const initial = name ? name.charAt(0).toUpperCase() : 'U';
    return { uri: `https://ui-avatars.com/api/?background=1e3572&color=fff&name=${initial}` };
  };

  const pickImageAndPost = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setUploading(true);
      const token = await SecureStore.getItemAsync('token');
      const formData = new FormData();
      
      const asset = result.assets[0];
      const localUri = asset.uri;
      const filename = asset.fileName || localUri.split('/').pop() || 'post.jpg';
      const type = asset.mimeType || 'image/jpeg';

      formData.append('image', { 
          uri: Platform.OS === 'ios' ? localUri.replace('file://', '') : localUri,
          type: type, 
          name: filename 
      } as any);

      try {
        const res = await fetch(`${BASE_URL}/posts`, { 
            method: 'POST', 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }, 
            body: formData 
        });
        
        const textResponse = await res.text();
        let data;

        try {
            data = JSON.parse(textResponse);
        } catch (e) {
            throw new Error(`Status ${res.status}: Servidor não encontrou a rota de upload POST /posts.`);
        }

        if (data.success) {
            Alert.alert("Sucesso", "Foto publicada!");
            loadPosts();
        } else {
            Alert.alert("Erro", data.error || "Falha no servidor");
        }
      } catch (err: any) { 
          console.log(err);
          Alert.alert("Erro de API", err.message || "Falha no upload"); 
      } finally { 
          setUploading(false); 
      }
    }
  };

  const handleLike = async (postId: string) => {
    const token = await SecureStore.getItemAsync('token');
    setPosts(prev => prev.map(p => p.id === postId ? { 
        ...p, 
        likedByMe: !p.likedByMe, 
        likes: p.likedByMe ? p.likes - 1 : p.likes + 1 
    } : p));
    await fetch(`${BASE_URL}/posts/${postId}/like`, { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` } 
    });
  };

  const handleSendComment = async (postId: string) => {
    const token = await SecureStore.getItemAsync('token');
    const post = posts.find(p => p.id === postId);
    if (!post?.newComment) return;
    
    await fetch(`${BASE_URL}/posts/${postId}/comment`, {
      method: 'POST',
      headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ comment: post.newComment }),
    });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, newComment: '' } : p));
    loadPosts();
  };

  return (
    <View style={{ flex: 1, backgroundColor: RESET_THEME.secondaryYellow }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.post, { backgroundColor: RESET_THEME.typoBlue }]}>
              <View style={styles.postHeader}>
                <Image source={getAvatar(item.author.avatar, item.author.username)} style={styles.avatar} />
                <Text style={{ fontWeight: 'bold', color: RESET_THEME.whiteAlt }}>{item.author.username}</Text>
              </View>
              
              <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
              
              <TouchableOpacity onPress={() => handleLike(item.id)} style={styles.likeBtn}>
                <Ionicons 
                    name={item.likedByMe ? "heart" : "heart-outline"} 
                    size={26} 
                    color={item.likedByMe ? RESET_THEME.primaryRed : RESET_THEME.whiteAlt} 
                />
                <Text style={{ color: RESET_THEME.whiteAlt, fontWeight: 'bold' }}> {item.likes} Likes</Text>
              </TouchableOpacity>

              <View style={{ padding: 10 }}>
                {item.comments && item.comments.map((c: any, i: number) => (
                  <View key={i} style={[styles.commentBubble, { backgroundColor: RESET_THEME.secondaryYellow }]}>
                    {/* Vai buscar os dados ao objeto author, com fallback de segurança */}
                    <Image 
                      source={getAvatar(c.author?.avatar || c.avatar, c.author?.username || c.username)} 
                      style={styles.miniAvatar} 
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: 'bold', color: RESET_THEME.typoBlue, fontSize: 12 }}>
                        {c.author?.username || c.username || 'Utilizador'}
                      </Text>
                      {/* Mostra c.comment (o padrão) ou c.text consoante o que o backend envia */}
                      <Text style={{ color: RESET_THEME.blackAlt }}>{c.comment || c.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.inputRow}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Comentar..." 
                  value={item.newComment} 
                  onChangeText={t => setPosts(prev => prev.map(p => p.id === item.id ? { ...p, newComment: t } : p))}
                />
                <TouchableOpacity onPress={() => handleSendComment(item.id)}>
                   <Ionicons name="send" size={24} color={RESET_THEME.secondaryYellow} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>
      
      <TouchableOpacity style={styles.fab} onPress={pickImageAndPost} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#FFF" /> : <Ionicons name="camera" size={30} color="#FFF" />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  post: { margin: 15, borderRadius: 15, overflow: 'hidden', elevation: 5 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' },
  image: { width: '100%', height: 350, backgroundColor: '#111' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 5 },
  commentBubble: { flexDirection: 'row', padding: 10, borderRadius: 15, marginBottom: 8, alignItems: 'center', marginHorizontal: 5 },
  miniAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 10 },
  inputRow: { flexDirection: 'row', padding: 15, alignItems: 'center', gap: 10 },
  input: { flex: 1, backgroundColor: '#FFF', borderRadius: 25, paddingHorizontal: 15, height: 45 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#fd151b', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 }
});