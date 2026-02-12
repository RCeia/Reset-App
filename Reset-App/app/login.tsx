import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/app/context/AuthContext';
import { BASE_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cores Oficiais Reset [cite: 17, 18, 19]
const RESET_COLORS = {
  primary: '#fd151b',    // Cor principal [cite: 17]
  secondary: '#ffb30f',  // Cor secundária [cite: 18]
  typography: '#1e3572', // Cor principal para tipografia [cite: 19]
  blackAlt: '#0d160b',   // Alternativa de preto [cite: 20]
  whiteAlt: '#edeff1',   // Alternativa de branco [cite: 21]
};

export default function LoginScreen() {
  const router = useRouter();
  const { setToken } = useContext(AuthContext); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor preencha email e password');
      return;
    }

    setLoading(true); // Ativa o estado de carregamento

    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Erro', data.error || 'Credenciais inválidas');
        setLoading(false); // Desativa se houver erro
        return;
      }

      await AsyncStorage.setItem('user_token', data.token);

      await setToken(data.token); 
      router.replace('/(tabs)/messages');

    } catch (err) {
      console.error("Erro no fetch:", err);
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
      setLoading(false); // Desativa se houver erro de rede
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

      <Text style={styles.title}>Login</Text>
      
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
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: loading ? '#ccc' : RESET_COLORS.typography }]} 
        onPress={handleLogin}
        disabled={loading} // Impede múltiplos cliques enquanto carrega
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>ENTRAR</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/')}>
        <Text style={styles.link}>Não tens conta? Regista-te</Text>
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
    backgroundColor: RESET_COLORS.secondary // Fundo Amarelo (Combinação nº1) [cite: 23]
  },
  logo: {
    width: 220,
    height: 100,
    marginBottom: 40,
  },
  title: { 
    fontSize: 24, 
    fontFamily: 'Archivo-Black', // Tipografia oficial para títulos [cite: 51]
    fontWeight: 'bold',
    color: RESET_COLORS.primary, // Vermelho sobre Amarelo [cite: 23]
    marginBottom: 30,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  input: { 
    borderWidth: 1, 
    width: '100%', 
    padding: 15, 
    borderRadius: 4, // Design simples [cite: 6]
    marginBottom: 15, 
    fontSize: 16,
    fontFamily: 'NotoSans-Light', // Tipografia para corpo de texto [cite: 52]
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
    fontFamily: 'Archivo-SemiBold', // Tipografia oficial [cite: 51]
    fontWeight: 'bold',
    letterSpacing: 1
  },
  link: {
    marginTop: 20,
    color: RESET_COLORS.typography,
    textDecorationLine: 'underline',
    fontFamily: 'NotoSans-Light'
  }
});