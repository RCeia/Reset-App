// app/(tabs)/social.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as SecureStore from 'expo-secure-store';
import io from 'socket.io-client';

const BASE_URL = 'http://192.168.1.132:3000'; // your machine IP

interface Post {
  id: string;
  imageUrl: string;
  likes: number;
  comments: string[];
  createdAt?: string;
  newComment?: string;
}

export default function SocialScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [posts, setPosts] = useState<Post[]>([]);
  const socketRef = useRef<any>(null);
  const listRef = useRef<FlatList<Post>>(null);

  useEffect(() => {
    // fetch initial posts
    fetch(`${BASE_URL}/posts`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // add newComment field for local editing
          const mapped: Post[] = data.posts.map((p: any) => ({ ...p, newComment: '' }));
          setPosts(mapped);
        }
      })
      .catch(err => console.error(err));

    // connect socket.io
    socketRef.current = io(BASE_URL);

    socketRef.current.on('connect', () => {
      console.log('socket connected', socketRef.current.id);
    });

    socketRef.current.on('new_post', (p: Post) => {
      setPosts(prev => [{ ...p, newComment: '' }, ...prev]);
      // scroll to top to show new post
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });

    socketRef.current.on('post_liked', (payload: { id: string; likes: number }) => {
      setPosts(prev => prev.map(post => (post.id === payload.id ? { ...post, likes: payload.likes } : post)));
    });

    socketRef.current.on('post_commented', (payload: { id: string; comment: string }) => {
      setPosts(prev => prev.map(post => (post.id === payload.id ? { ...post, comments: [...post.comments, payload.comment] } : post)));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const pickImageAndPost = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'You need to allow gallery access!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (pickerResult.canceled) return;
    const uri = pickerResult.assets[0].uri;

    // get token
    const token = await SecureStore.getItemAsync('token');
    if (!token) {
      Alert.alert('Not logged in', 'Please login before posting.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', {
        uri,
        name: `post-${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      const res = await fetch(`${BASE_URL}/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // DON'T set Content-Type; fetch will set the multipart boundary
        },
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        Alert.alert('Upload failed');
        return;
      }

      // server will emit 'new_post' and socket handler will add it
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not upload post');
    }
  };

  const handleLike = async (postId: string) => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) {
      Alert.alert('Not logged in', 'Login to like posts.');
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      // server emits update; no local update required
    } catch (err) { console.error(err); }
  };

  const handleSendComment = async (postId: string) => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) {
      Alert.alert('Not logged in', 'Login to comment.');
      return;
    }
    const post = posts.find(p => p.id === postId);
    if (!post || !post.newComment || !post.newComment.trim()) return;

    try {
      const res = await fetch(`${BASE_URL}/posts/${postId}/comment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: post.newComment }),
      });
      // server emits 'post_commented' — socket handler will append it
      // clear local input
      setPosts(prev => prev.map(p => (p.id === postId ? { ...p, newComment: '' } : p)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[styles.post, { backgroundColor: themeColors.tint + '11' }]}>
            <Image source={{ uri: item.imageUrl }} style={styles.image} />

            <TouchableOpacity onPress={() => handleLike(item.id)}>
              <Text style={{ color: themeColors.text, marginTop: 10 }}>
                ❤️ {item.likes} Likes
              </Text>
            </TouchableOpacity>

            <View style={{ marginTop: 10 }}>
              {item.comments.map((c, i) => (
                <Text key={i} style={{ color: themeColors.text }}>
                  • {c}
                </Text>
              ))}
            </View>

            <View style={styles.commentRow}>
              <TextInput
                style={[styles.commentInput, { borderColor: themeColors.tint, color: themeColors.text }]}
                placeholder="Write a comment..."
                placeholderTextColor={themeColors.text + '55'}
                value={item.newComment ?? ''}
                onChangeText={text => setPosts(prev => prev.map(p => (p.id === item.id ? { ...p, newComment: text } : p)))}
              />
              <TouchableOpacity
                style={[styles.commentButton, { backgroundColor: themeColors.tint }]}
                onPress={() => handleSendComment(item.id)}
              >
                <Text style={{ color: '#fff' }}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.addPhotoButton, { backgroundColor: themeColors.tint }]}
        onPress={pickImageAndPost}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add Photo</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  post: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },

  image: {
    width: '100%',
    height: 250,
    borderRadius: 10,
  },

  commentRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },

  commentInput: {
    flex: 1,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },

  commentButton: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
  },

  addPhotoButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
