import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { BASE_URL } from '@/constants/Config';

// Cores Oficiais Reset [cite: 17, 18, 19]
const RESET_COLORS = {
  primary: '#fd151b',    // Vermelho [cite: 17]
  secondary: '#ffb30f',  // Amarelo [cite: 18]
  typography: '#1e3572', // Azul Escuro 
};

export default function RegisterScreen() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As passwords não coincidem');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (!res.ok) {
        Alert.alert('Erro no Registo');
        setLoading(false);
        return;
      }

      Alert.alert('Sucesso', 'Conta criada! Por favor faça login.');
      router.push('/login');
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível conectar ao servidor');
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Logótipo - Versão Estendida [cite: 8] */}
      <Image 
        source={require('@/assets/images/reset-logo-extended.png')} 
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Registo</Text>
      
      <TextInput
        placeholder="Username"
        placeholderTextColor="#555"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#555"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#555"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor="#555"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
        secureTextEntry
      />

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: RESET_COLORS.typography }]} 
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "A PROCESSAR..." : "REGISTAR"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.link}>Já tens conta? Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: RESET_COLORS.secondary // Fundo Amarelo 
  },
  logo: {
    width: 180,
    height: 80,
    marginBottom: 20,
  },
  title: { 
    fontSize: 24, 
    fontFamily: 'Archivo-Black', // Fonte de Títulos [cite: 51]
    fontWeight: 'bold', 
    color: RESET_COLORS.primary, // Vermelho [cite: 17]
    marginBottom: 25,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: { 
    borderWidth: 1, 
    width: '100%', 
    padding: 15, 
    borderRadius: 4, 
    marginBottom: 12, 
    fontSize: 16,
    fontFamily: 'NotoSans-Light', // Fonte de Corpo [cite: 52]
    borderColor: RESET_COLORS.typography,
    backgroundColor: 'rgba(255, 255, 255, 0.9)'
  },
  button: {
    width: '100%',
    padding: 18,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#FFF',
    fontFamily: 'Archivo-SemiBold', // Fonte de Sub-títulos [cite: 51]
    fontWeight: 'bold',
    letterSpacing: 1
  },
  link: { 
    marginTop: 20, 
    fontFamily: 'NotoSans-Light', 
    color: RESET_COLORS.typography, 
    textDecorationLine: 'underline' 
  },
});