import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/app/context/AuthContext';

const RESET_COLORS = {
  primary: '#fd151b',    // Vermelho (para o logo e texto de destaque)
  secondary: '#ffb30f',  // Amarelo (para o fundo)
  typography: '#1e3572', // Azul Escuro (para inputs e botões)
  blackAlt: '#0d160b',
  whiteAlt: '#edeff1',
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
    // ... lógica de fetch ...
    setLoading(false);
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: RESET_COLORS.secondary // Fundo Amarelo (Combinação nº1)
  },
  logo: {
    width: 220,
    height: 100,
    marginBottom: 40,
  },
  title: { 
  fontSize: 24, // Reduzido de 28 para ser mais subtil
  fontFamily: 'Archivo-Black', // Alternativa à Black [cite: 51]
  fontWeight: 'bold',
  color: RESET_COLORS.primary, 
  marginBottom: 30,
  textTransform: 'uppercase', // Opcional: dá um ar mais profissional de competição
  letterSpacing: 2, // Aumenta o espaçamento para um look mais moderno
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)' // Branco levemente transparente
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
  }
});