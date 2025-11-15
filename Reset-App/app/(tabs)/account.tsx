import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as SecureStore from 'expo-secure-store';
import AuthProvider, { AuthContext } from '@/app/context/AuthContext';



export default function AccountScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const { token, setToken, isLoggedIn } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://192.168.1.132:3000/login', {
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

  if (!isLoggedIn) {
    // Show login form
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
      <Text style={[styles.text, { color: themeColors.text }]}>Welcome to your Account!</Text>
      <Text style={[styles.text, { color: themeColors.text, marginTop: 10 }]}>Your token: {token}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '100%', borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 12 },
  text: { fontSize: 18, fontWeight: 'bold' },
});
