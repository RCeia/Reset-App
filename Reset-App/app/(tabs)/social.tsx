// app/(tabs)/social.tsx
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Post {
  id: string;
  image: string;
  likes: number;
  comments: string[];
  newComment: string; // store new comment for each post
}

export default function SocialScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [posts, setPosts] = useState<Post[]>([]);

  // Fake WebSocket simulator
  useEffect(() => {
    const interval = setInterval(() => {
      const randomNewPost: Post = {
        id: Math.random().toString(),
        image: 'https://picsum.photos/400?random=' + Math.random(),
        likes: 0,
        comments: [],
        newComment: '',
      };
      setPosts(prev => [randomNewPost, ...prev]);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const handleLike = (id: string) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === id ? { ...post, likes: post.likes + 1 } : post
      )
    );
  };

  const handleComment = (id: string) => {
    setPosts(prev =>
      prev.map(post => {
        if (post.id === id && post.newComment.trim()) {
          return { ...post, comments: [...post.comments, post.newComment], newComment: '' };
        }
        return post;
      })
    );
  };

const pickImageAndPost = async () => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    alert('Permission to access gallery is required!');
    return;
  }

  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images, // correct usage
    allowsEditing: true,
    quality: 0.7,
  });

  if (!pickerResult.canceled) {
    const uri = pickerResult.assets[0].uri;
    const newPost: Post = {
      id: Math.random().toString(),
      image: uri,
      likes: 0,
      comments: [],
      newComment: '',
    };
    setPosts(prev => [newPost, ...prev]);
  }
};


  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <View style={[styles.post, { backgroundColor: themeColors.card ?? themeColors.tint + '22' }]}>
            <Image source={{ uri: item.image }} style={styles.image} />

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
                value={item.newComment}
                onChangeText={text =>
                  setPosts(prev =>
                    prev.map(p => (p.id === item.id ? { ...p, newComment: text } : p))
                  )
                }
              />
              <TouchableOpacity
                style={[styles.commentButton, { backgroundColor: themeColors.tint }]}
                onPress={() => handleComment(item.id)}
              >
                <Text style={{ color: '#fff' }}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add Photo button at bottom */}
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
