// app/(tabs)/account.tsx
import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AuthProvider, { AuthContext } from '@/app/context/AuthContext';
import DefaultAvatar from '@/assets/images/defaultAvatar.jpg';

const BASE_URL = 'http://192.168.1.132:3000';

export default function AccountScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const { token, setToken, isLoggedIn } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('User');

  // Fetch user info when logged in
  useEffect(() => {
    if (isLoggedIn && token) {
      fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          setUsername(data.username || 'User');
          setAvatarUri(data.avatar || null);
        })
        .catch(err => console.error(err));
    }
  }, [isLoggedIn, token]);

  // Login function
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        Alert.alert('Error', 'Invalid credentials');
        setLoading(false);
        return;
      }

      const data = await res.json();
      await SecureStore.setItemAsync('token', data.token);
      setToken(data.token);
      Alert.alert('Success', 'Logged in!');
      setLoading(false);
    } catch (err) {
      Alert.alert('Error', 'Could not connect to backend');
      console.error(err);
      setLoading(false);
    }
  };

  // Pick and upload avatar
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permission to access gallery is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!pickerResult.canceled) {
      const uri = pickerResult.assets[0].uri;
      setAvatarUri(uri);
      await uploadAvatar(uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      // Do NOT set Content-Type; fetch will handle boundary automatically
      const res = await fetch(`${BASE_URL}/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        Alert.alert('Error', 'Failed to upload avatar');
      } else {
        Alert.alert('Success', 'Avatar updated!');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not upload avatar');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
          <Text style={[styles.title, { color: themeColors.text }]}>Login to Your Account</Text>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { borderColor: themeColors.text, color: themeColors.text }]}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { borderColor: themeColors.text, color: themeColors.text }]}
            secureTextEntry
          />
          <Button title={loading ? "Logging in..." : "Login"} onPress={handleLogin} disabled={loading} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Show account info
  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage}>
        <Image
          source={avatarUri ? { uri: avatarUri } : DefaultAvatar}
          style={styles.avatar}
        />
        <View style={styles.plusIcon}>
          <Text style={styles.plusText}>+</Text>
        </View>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="small" color={themeColors.tint} />}

      <Text style={[styles.username, { color: themeColors.text }]}>{username}</Text>
      <Text style={[styles.text, { color: themeColors.text, marginTop: 10 }]}>
        Your token: {token}
      </Text>
    </View>
  );
}

const AVATAR_SIZE = 120;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '100%', borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 12 },
  text: { fontSize: 18, fontWeight: 'bold' },
  avatarWrapper: { position: 'relative', marginBottom: 20 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 2, borderColor: '#ccc' },
  plusIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#007bff',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  plusText: { color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 20 },
  username: { fontSize: 24, fontWeight: 'bold' },
});
