// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AuthProvider from '@/app/context/AuthContext';
import { View } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* Usamos uma View flex:1 para garantir que o layout ocupa o ecrã todo */}
        <View style={{ flex: 1 }}>
          
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen 
              name="modal" 
              options={{ presentation: 'modal', title: 'Modal' }} 
            />
          </Stack>

          <StatusBar style="auto" />
        </View>
      </ThemeProvider>
    </AuthProvider>
  );
}