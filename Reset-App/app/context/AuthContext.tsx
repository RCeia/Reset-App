// app/context/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

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
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await SecureStore.getItemAsync('token');
      if (storedToken) setToken(storedToken);
    };
    loadToken();
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}
