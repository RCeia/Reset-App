import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/app/context/AuthContext';
import { BASE_URL } from '@/constants/Config';

// Cores Oficiais Reset
const RESET_COLORS = {
  primary: '#fd151b',    // Cor principal
  secondary: '#ffb30f',  // Cor secundária
  typography: '#1e3572', // Cor principal para tipografia
  blackAlt: '#0d160b',   // Alternativa de preto
  whiteAlt: '#edeff1',   // Alternativa de branco
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

    setLoading(true);

    try {
      console.log("A tentar ligar a:", `${BASE_URL}/login`);

      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'PostmanRuntime/7.28.4' // Esta é a chave mestra para o Ngrok ignorar a segurança
        },
        body: JSON.stringify({ email, password }),
      });

      // Lemos a resposta como texto puro em vez de JSON para ver o erro HTML
      const rawText = await res.text();
      console.log("RESPOSTA RAW DO SERVIDOR:", rawText.substring(0, 300));

      // Tentamos converter para JSON
      const data = JSON.parse(rawText);

      if (!res.ok) {
        Alert.alert('Erro', data.error || 'Credenciais inválidas');
        setLoading(false);
        return;
      }

      await setToken(data.token); 
      router.replace('/(tabs)/messages');

    } catch (err) {
      console.error("ERRO COMPLETO:", err);
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
        disabled={loading}
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
    backgroundColor: RESET_COLORS.secondary 
  },
  logo: {
    width: 220,
    height: 100,
    marginBottom: 40,
  },
  title: { 
    fontSize: 24, 
    fontFamily: 'Archivo-Black', 
    fontWeight: 'bold',
    color: RESET_COLORS.primary, 
    marginBottom: 30,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  input: { 
    borderWidth: 1, 
    width: '100%', 
    padding: 15, 
    borderRadius: 4, 
    marginBottom: 15, 
    fontSize: 16,
    fontFamily: 'NotoSans-Light', 
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
    fontFamily: 'Archivo-SemiBold', 
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