// app/context/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native'; // 1. Importar Platform

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  isLoggedIn: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  isLoggedIn: false,
});

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  // 2. Funções Auxiliares para lidar com Web vs Mobile
  const getTokenFromStorage = async () => {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem('token');
      } catch (e) {
        return null;
      }
    } else {
      return await SecureStore.getItemAsync('token');
    }
  };

  const saveTokenToStorage = async (value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('token', value);
    } else {
      await SecureStore.setItemAsync('token', value);
    }
  };

  const removeTokenFromStorage = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('token');
    } else {
      await SecureStore.deleteItemAsync('token');
    }
  };

  // 3. Carregar Token ao Iniciar
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await getTokenFromStorage(); // Usa a nossa função segura
      if (storedToken) {
        setTokenState(storedToken);
      }
    };
    loadToken();
  }, []);

  // 4. Função wrapper para atualizar Estado E Armazenamento
  // Quando você chamar setToken('abc'), ele atualiza o React e guarda no telemóvel/browser
  const setToken = async (newToken: string | null) => {
    setTokenState(newToken); // Atualiza o estado (React)
    
    if (newToken) {
      await saveTokenToStorage(newToken); // Guarda no disco
    } else {
      await removeTokenFromStorage(); // Apaga do disco (Logout)
    }
  };

  return (
    <AuthContext.Provider value={{ token, setToken, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}