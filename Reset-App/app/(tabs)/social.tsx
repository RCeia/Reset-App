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

import { BASE_URL } from '@/constants/Config';

interface Post {
  id: string;
  imageUrl: string;
  description: string;
  likes: number;
  comments: string[];
  createdAt?: string;
  newComment?: string;
  author: {
    username: string;
    avatar: string;
  };
}

export default function SocialScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [posts, setPosts] = useState<Post[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [postDescription, setPostDescription] = useState('');

  const socketRef = useRef<any>(null);
  const listRef = useRef<FlatList<Post>>(null);

  useEffect(() => {
    // fetch initial posts
    fetch(`${BASE_URL}/posts`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
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

    setSelectedImage(pickerResult.assets[0].uri);
    setPostDescription('');
    setIsPosting(true); // open modal
  };

  const handleLike = async (postId: string) => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) {
      Alert.alert('Not logged in', 'Login to like posts.');
      return;
    }
    try {
      await fetch(`${BASE_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error(err);
    }
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
      await fetch(`${BASE_URL}/posts/${postId}/comment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: post.newComment }),
      });
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
            <View style={styles.postHeader}>
              {item.author.avatar ? (
                <Image source={{ uri: item.author.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
              )}
              <Text style={[styles.username, { color: themeColors.text }]}>
                {item.author.username}
              </Text>
            </View>

            {item.description ? (
              <Text style={{ color: themeColors.text, fontStyle: 'italic', marginTop: 4 }}>
                {item.description}
              </Text>
            ) : null}

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

      {/* Post Description Modal */}
      {isPosting && selectedImage && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Post Description</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter description..."
              value={postDescription}
              onChangeText={setPostDescription}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.commentButton, { flex: 1 }]}
                onPress={() => setIsPosting(false)}
              >
                <Text style={{ color: '#fff', textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.commentButton, { flex: 1 }]}
                onPress={async () => {
                  setIsPosting(false);
                  if (!selectedImage) return;

                  const token = await SecureStore.getItemAsync('token');
                  if (!token) {
                    Alert.alert('Not logged in', 'Please login before posting.');
                    return;
                  }

                  try {
                    const formData = new FormData();
                    formData.append('image', {
                      uri: selectedImage,
                      name: `post-${Date.now()}.jpg`,
                      type: 'image/jpeg',
                    } as any);
                    formData.append('description', postDescription);

                    const res = await fetch(`${BASE_URL}/posts`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                      body: formData,
                    });
                    const data = await res.json();
                    if (!data.success) Alert.alert('Upload failed');
                  } catch (err) {
                    console.error(err);
                    Alert.alert('Error', 'Could not upload post');
                  }
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center' }}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    paddingBottom: 2,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 100,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
  },
});
