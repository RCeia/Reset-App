import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
// ❌ REMOVIDO: import * as SecureStore from 'expo-secure-store'; (Não precisamos disto aqui)
import { AuthContext } from '@/app/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { BASE_URL } from '@/constants/Config';

export default function LoginScreen() {
  const router = useRouter();
  // O setToken que vem do Contexto já sabe se deve gravar no SecureStore ou LocalStorage
  const { setToken } = useContext(AuthContext); 
  
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Adicionei estado de loading para feedback visual

  const handleLogin = async () => {
    if (!email || !password) {
      // Alert nativo funciona na Web, mas é feio. Para teste serve.
      Alert.alert('Erro', 'Por favor preencha email e password');
      return;
    }

    setLoading(true);

    try {
      console.log("Tentando login em:", `${BASE_URL}/login`); // Debug para ver se o IP está certo

      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Erro', data.error || 'Credenciais inválidas'); // Mostra a msg do backend se houver
        setLoading(false);
        return;
      }

      // ✅ A CORREÇÃO ESTÁ AQUI:
      // Removemos o SecureStore.setItemAsync manual.
      // Chamamos apenas o setToken do contexto. Ele agora é inteligente!
      await setToken(data.token); 
      
      // Só redireciona depois de gravar
      router.replace('/(tabs)/messages'); // ou '/home' dependendo das suas rotas

    } catch (err) {
      console.error("Erro no fetch:", err);
      // Na Web, erros de conexão aparecem aqui se o Backend não tiver CORS ativado
      Alert.alert('Erro', 'Não foi possível conectar ao servidor. Verifique o IP ou CORS.');
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Login</Text>
      
      <TextInput
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { color: themeColors.text, borderColor: themeColors.text + '40' }]}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        style={[styles.input, { color: themeColors.text, borderColor: themeColors.text + '40' }]}
        secureTextEntry
      />
      
      <View style={{ marginTop: 10, width: '100%' }}>
          <Button 
            title={loading ? "Entrando..." : "Login"} 
            onPress={handleLogin} 
            disabled={loading}
          />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, width: '100%', padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 16 },
});