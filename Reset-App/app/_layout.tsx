import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AuthProvider from '@/app/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';

// IMPORTAR AS FONTES DOS PACOTES
import { 
  useFonts, 
  Archivo_900Black, 
  Archivo_600SemiBold 
} from '@expo-google-fonts/archivo';
import { 
  NotoSans_300Light 
} from '@expo-google-fonts/noto-sans';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // CARREGAR AS FONTES
  const [fontsLoaded, error] = useFonts({
    'Archivo-Black': Archivo_900Black,
    'Archivo-SemiBold': Archivo_600SemiBold,
    'NotoSans-Light': NotoSans_300Light,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffb30f' }}>
        <ActivityIndicator size="large" color="#fd151b" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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