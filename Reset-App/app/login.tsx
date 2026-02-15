import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/app/context/AuthContext';
import { BASE_URL } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  
  // Estados de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados de Recuperação de Senha (NOVO)
  const [modalVisible, setModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = Email, 2 = Código
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // --- FUNÇÃO DE LOGIN EXISTENTE ---
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor preencha email e password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Erro', data.error || 'Credenciais inválidas');
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('user_token', data.token);
      await setToken(data.token); 
      router.replace('/(tabs)/messages');

    } catch (err) {
      console.error("Erro no fetch:", err);
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
      setLoading(false);
    }
  };

  // --- NOVAS FUNÇÕES DE RECUPERAÇÃO ---
  
  // Passo 1: Enviar o código para o email
  const handleSendCode = async () => {
    if (!resetEmail) {
      Alert.alert('Erro', 'Por favor insere o teu email.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      
      if (data.success) {
        Alert.alert('Sucesso', 'Código enviado! Verifica o teu email.');
        setResetStep(2);
      } else {
        Alert.alert('Erro', data.error || 'Falha ao enviar email.');
      }
    } catch (err) {
      Alert.alert('Erro', 'Falha na conexão com o servidor.');
    } finally {
      setResetLoading(false);
    }
  };

  // Passo 2: Redefinir a senha
  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) {
      Alert.alert('Erro', 'Preenche o código e a nova senha.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword })
      });
      const data = await res.json();
      
      if (data.success) {
        Alert.alert('Sucesso', 'Senha alterada! Podes fazer login agora.');
        setModalVisible(false);
        setResetStep(1);
        setResetEmail('');
        setResetCode('');
        setNewPassword('');
      } else {
        Alert.alert('Erro', data.error || 'Código inválido.');
      }
    } catch (err) {
      Alert.alert('Erro', 'Falha na conexão.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Logótipo - Versão Estendida */}
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

      {/* NOVO LINK DE RECUPERAÇÃO */}
      <TouchableOpacity onPress={() => setModalVisible(true)} style={{ marginTop: 15 }}>
        <Text style={[styles.link, { marginTop: 0, fontSize: 14 }]}>Esqueci-me da palavra-passe</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/')}>
        <Text style={styles.link}>Não tens conta? Regista-te</Text>
      </TouchableOpacity>


      {/* --- MODAL DE RECUPERAÇÃO (NOVO) --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recuperar Conta</Text>

            {resetStep === 1 ? (
              // STEP 1: Pedir Email
              <>
                <Text style={styles.modalText}>Insere o teu email para receberes um código:</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="O teu email" 
                  placeholderTextColor="#999"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: RESET_COLORS.primary }]} 
                  onPress={handleSendCode}
                  disabled={resetLoading}
                >
                  {resetLoading ? <ActivityIndicator color="#FFF"/> : <Text style={styles.buttonText}>ENVIAR CÓDIGO</Text>}
                </TouchableOpacity>
              </>
            ) : (
              // STEP 2: Inserir Código e Nova Senha
              <>
                <Text style={styles.modalText}>Verifica o email e define a nova senha:</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Código de 6 dígitos" 
                  placeholderTextColor="#999"
                  value={resetCode}
                  onChangeText={setResetCode}
                  keyboardType="numeric"
                />
                <TextInput 
                  style={styles.input} 
                  placeholder="Nova Palavra-passe" 
                  placeholderTextColor="#999"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: RESET_COLORS.primary }]} 
                  onPress={handleResetPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? <ActivityIndicator color="#FFF"/> : <Text style={styles.buttonText}>ALTERAR SENHA</Text>}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity 
              onPress={() => { setModalVisible(false); setResetStep(1); }} 
              style={{marginTop: 15, padding: 10}}
            >
              <Text style={{color: RESET_COLORS.typography, fontFamily: 'NotoSans-Light'}}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  },
  // --- ESTILOS DO MODAL ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 53, 114, 0.8)', // Fundo azul escuro semitransparente (typography com opacity)
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 25,
    elevation: 10,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Archivo-Black',
    color: RESET_COLORS.primary,
    marginBottom: 20,
    textTransform: 'uppercase'
  },
  modalText: {
    fontFamily: 'NotoSans-Light',
    color: RESET_COLORS.blackAlt,
    marginBottom: 15,
    textAlign: 'center'
  }
});