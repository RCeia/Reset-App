import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Dimensions,
  Animated,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

// Importações para PDF
import { copyAsync, documentDirectory, getContentUriAsync } from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as WebBrowser from "expo-web-browser";
import { Asset } from "expo-asset";

import { AuthContext } from '@/app/context/AuthContext';
import DefaultAvatar from '@/assets/images/defaultAvatar.jpg';
import { BASE_URL } from '@/constants/Config';

// --- CORES OFICIAIS RESET ---
const RESET_COLORS = {
  primary: '#fd151b',    // Vermelho
  secondary: '#ffb30f',  // Amarelo
  typography: '#1e3572', // Azul Escuro
  whiteAlt: '#edeff1',   // Branco Sujo
  blackAlt: '#0d160b'    // Preto Sujo
};

const SCREEN_HEIGHT = Dimensions.get("window").height;

// --- AJUSTE DE TAMANHO ---
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.28; 
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.60;  

// --- CONFIGURAÇÃO DA DATA FINAL ---
interface DateObj { year: number; month: number; day: number; hours: number; minutes: number; }
const fim: DateObj = { day: 3, month: 3, year: 2026, hours: 21, minutes: 59 };

const events = [
  { id: "1", title: "Check-in + Coffee Break", startHour: 9, endHour: 10, color: RESET_COLORS.typography }, 
  { id: "2", title: "Workshops", startHour: 10, endHour: 12, color: RESET_COLORS.secondary },
  { id: "3", title: "Almoço", startHour: 12, endHour: 13, color: RESET_COLORS.typography },
  { id: "4", title: "Opening Ceremony", startHour: 13, endHour: 14.5, color: RESET_COLORS.secondary },
  { id: "5", title: "Topic Presentation", startHour: 14.5, endHour: 15.5, color: RESET_COLORS.typography },
  { id: "6", title: "Competition", startHour: 15.5, endHour: 23.99, color: RESET_COLORS.primary },
];

// --- COMPONENTE COUNTDOWN (ULTRA COMPACTO) ---
const CountdownTimer = ({ endTime }: { endTime: DateObj }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const end = new Date(endTime.year, endTime.month - 1, endTime.day, endTime.hours, endTime.minutes);
      return Math.max(end.getTime() - now.getTime(), 0);
    };
    setTimeLeft(calculate());
    const interval = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  if (timeLeft === 0) return (
    <View style={styles.timerContainer}>
      <Text style={[styles.timerText, { color: '#FFF', fontSize: 14 }]}>COMPETIÇÃO TERMINADA</Text>
    </View>
  );

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerLabel}>Tempo Restante</Text>
      <Text style={styles.timerText}>
        {hours.toString().padStart(2, "0")}:{minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
      </Text>
    </View>
  );
};

// --- LÓGICA DO HORÁRIO E PDF ---
const getCurrentTimeBounds = (expanded: boolean) => {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  let startHour, endHour;

  if (expanded) {
    startHour = 0;
    endHour = 24;
  } else {
    startHour = Math.max(0, currentHour - 2);
    endHour = startHour + 6; 
    if (endHour > 24) {
      endHour = 24;
      startHour = Math.max(0, endHour - 6);
    }
  }
  return { startHour: Math.floor(startHour), endHour: Math.ceil(endHour) };
};

const getCurrentTimePosition = (startHour: number, endHour: number, height: number) => {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  return ((currentHour - startHour) / (endHour - startHour)) * height;
};

function EventSchedule() {
  const [expanded, setExpanded] = useState(false);
  const [scheduleHeight, setScheduleHeight] = useState(COLLAPSED_HEIGHT);
  const [timeBounds, setTimeBounds] = useState(getCurrentTimeBounds(false));

  const animatedHeight = useState(new Animated.Value(COLLAPSED_HEIGHT))[0];
  const animatedPosition = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(animatedHeight, { toValue: scheduleHeight, duration: 500, useNativeDriver: false }).start();
  }, [scheduleHeight]);

  useEffect(() => {
    const { startHour, endHour } = timeBounds;
    Animated.timing(animatedPosition, {
      toValue: getCurrentTimePosition(startHour, endHour, scheduleHeight),
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [timeBounds, scheduleHeight]);

  const toggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    setScheduleHeight(newExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT);
    setTimeBounds(getCurrentTimeBounds(newExpanded));
  };

  const openSchedulePdf = async () => {
    try {
        const asset = Asset.fromModule(require('@/assets/pdfs/survival_guide.pdf'));
        await asset.downloadAsync();
        const pdfUri = asset.localUri || asset.uri;

        if (Platform.OS === "web") {
            window.open(pdfUri);
            return;
        }

        const fileUri = `${documentDirectory}Horario_Competicao.pdf`;
        await copyAsync({ from: pdfUri, to: fileUri });
        
        if (Platform.OS === "android") {
            const contentUri = await getContentUriAsync(fileUri);
            await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
                data: contentUri,
                flags: 1,
                type: "application/pdf",
            });
        } else {
            await WebBrowser.openBrowserAsync(fileUri);
        }
    } catch (error) {
        Alert.alert("Erro", "Não foi possível abrir o PDF do horário.");
    }
  };

  return (
    <View style={styles.scheduleSection}>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Horário da Competição</Text>
        <TouchableOpacity style={styles.pdfButtonSmall} onPress={openSchedulePdf}>
            <Text style={styles.pdfButtonText}>PDF</Text>
        </TouchableOpacity>
      </View>
      
      <Animated.View style={[styles.scheduleContainer, { height: animatedHeight }]}>
        {Array.from({ length: timeBounds.endHour - timeBounds.startHour + 1 }).map((_, i) => (
          <View key={i} style={[styles.hourRow, { height: scheduleHeight / (timeBounds.endHour - timeBounds.startHour) }]}>
            <Text style={styles.hourText}>{`${Math.floor(i + timeBounds.startHour)}:00`}</Text>
          </View>
        ))}

        {events.map((event) => {
          if (event.endHour < timeBounds.startHour || event.startHour > timeBounds.endHour) return null;
          const duration = timeBounds.endHour - timeBounds.startHour;
          const eventStart = ((event.startHour - timeBounds.startHour) / duration) * scheduleHeight;
          const eventHeight = ((event.endHour - event.startHour) / duration) * scheduleHeight;

          return (
            <View key={event.id} style={[styles.event, { top: eventStart, height: eventHeight, backgroundColor: event.color }]}>
              <Text style={[
                styles.eventText, 
                eventHeight < 30 ? { fontSize: 8 } : {},
                { color: event.color === RESET_COLORS.whiteAlt ? RESET_COLORS.typography : '#FFF' }
              ]}>{event.title}</Text>
            </View>
          );
        })}

        <Animated.View style={[styles.timeIndicator, { top: animatedPosition }]} />
      </Animated.View>

      <TouchableOpacity onPress={toggleExpand} style={styles.toggleButton}>
        <Text style={styles.toggleText}>{expanded ? "Recolher" : "Expandir"}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AccountScreen() {
  const { token, setToken, isLoggedIn } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('Participante');

  useEffect(() => {
    if (isLoggedIn && token) {
      fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          setUsername(data.username || 'Participante');
          setAvatarUri(data.avatar || null);
        })
        .catch(err => console.error(err));
    }
  }, [isLoggedIn, token]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        Alert.alert('Erro', 'Credenciais inválidas');
        setLoading(false);
        return;
      }
      const data = await res.json();
      await SecureStore.setItemAsync('token', data.token);
      setToken(data.token);
      setLoading(false);
    } catch (err) {
      Alert.alert('Erro', 'Falha na conexão');
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('É necessária permissão para aceder à galeria!');
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!pickerResult.canceled) {
      const uri = pickerResult.assets[0].uri;
      setAvatarUri(uri);
      await uploadAvatar(uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await fetch(`${BASE_URL}/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) Alert.alert('Erro', 'Falha ao carregar avatar');
      else Alert.alert('Sucesso', 'Avatar atualizado!');
    } catch (err) {
      Alert.alert('Erro', 'Falha ao carregar avatar');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.loginContainer}>
          <Text style={styles.loginTitle}>LOGIN</Text>
          <TextInput placeholder="Email" placeholderTextColor="#666" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
          <TextInput placeholder="Password" placeholderTextColor="#666" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF"/> : <Text style={styles.primaryButtonText}>ENTRAR</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ alignItems: 'center', paddingBottom: 50 }}
    >
      <Image 
        source={require('@/assets/images/reset-logo-extended.png')} 
        style={styles.topLogo} 
        resizeMode="contain"
      />

      <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage}>
        <Image 
          source={avatarUri ? { uri: avatarUri } : require('@/assets/images/defaultAvatar.jpg')} 
          style={styles.avatar} 
        />
        <View style={styles.plusIcon}>
          <Text style={styles.plusText}>+</Text>
        </View>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="small" color={RESET_COLORS.typography} />}
      <Text style={styles.username}>{username}</Text>
      
      {/* COUNTDOWN */}
      <CountdownTimer endTime={fim} />

      {/* HORÁRIO */}
      <EventSchedule />

    </ScrollView>
  );
}

const AVATAR_SIZE = 120;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: RESET_COLORS.secondary }, 
  loginContainer: { flex: 1, backgroundColor: RESET_COLORS.secondary, justifyContent: 'center', alignItems: 'center', padding: 20 },

  loginTitle: { fontSize: 28, fontFamily: 'Archivo-Black', color: RESET_COLORS.primary, marginBottom: 30, letterSpacing: 1 },
  username: { fontSize: 24, fontFamily: 'Archivo-Black', color: RESET_COLORS.typography, marginBottom: 15, marginTop: 10 },
  
  topLogo: { width: '70%', height: 70, marginTop: 40, marginBottom: 10 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontFamily: 'Archivo-Black', color: RESET_COLORS.typography },
  
  pdfButtonSmall: { backgroundColor: RESET_COLORS.primary, paddingVertical: 5, paddingHorizontal: 15, borderRadius: 4, elevation: 2 },
  pdfButtonText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', fontFamily: 'Archivo-SemiBold' },

  input: { width: '100%', borderWidth: 1, borderRadius: 4, padding: 15, marginBottom: 15, backgroundColor: '#fff', borderColor: RESET_COLORS.typography, fontFamily: 'NotoSans-Light', fontSize: 16 },
  primaryButton: { width: '100%', padding: 18, backgroundColor: RESET_COLORS.typography, borderRadius: 4, alignItems: 'center', elevation: 3 },
  primaryButtonText: { color: '#FFF', fontFamily: 'Archivo-SemiBold', fontWeight: 'bold', letterSpacing: 1 },

  avatarWrapper: { position: 'relative', marginBottom: 10, marginTop: 10 }, 
  
  // --- ALTERAÇÃO AQUI: Borda Azul Escuro ---
  avatar: { 
    width: AVATAR_SIZE, height: AVATAR_SIZE, 
    borderRadius: AVATAR_SIZE / 2, 
    borderWidth: 3, 
    borderColor: RESET_COLORS.typography, // Azul Escuro
    backgroundColor: RESET_COLORS.whiteAlt 
  },
  
  plusIcon: { position: 'absolute', right: 0, bottom: 0, backgroundColor: RESET_COLORS.primary, width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  plusText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: -2 },

  // --- TIMER ULTRA COMPACTO ---
  timerContainer: { 
    width: '65%', 
    backgroundColor: RESET_COLORS.typography, 
    borderRadius: 6, 
    paddingVertical: 3, 
    paddingHorizontal: 5, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#FFF', 
    alignItems: 'center', 
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  timerLabel: { fontSize: 10, fontFamily: 'NotoSans-Light', color: '#FFF', marginBottom: 0 }, 
  timerText: { fontSize: 18, fontFamily: 'Archivo-Black', color: '#FFF', lineHeight: 22 }, 

  // --- HORÁRIO ---
  scheduleSection: { width: '100%', paddingHorizontal: 15, marginTop: 10 },
  
  scheduleContainer: { 
    width: "100%", 
    backgroundColor: '#FFF', // Fundo Branco
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: RESET_COLORS.typography, // Borda Azul Escuro
    overflow: "hidden", 
    position: 'relative' 
  },
  
  hourRow: { 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee", // Linhas cinzentas claras
    justifyContent: "center", 
    paddingLeft: 15, 
    backgroundColor: '#FFF' // Fundo Branco
  },
  
  hourText: { fontSize: 12, color: "#666", fontFamily: 'NotoSans-Light' },
  
  event: { position: "absolute", left: 60, right: 5, borderRadius: 4, paddingHorizontal: 8, justifyContent: "center" },
  eventText: { fontFamily: 'Archivo-SemiBold', fontSize: 10 },
  
  timeIndicator: { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: RESET_COLORS.primary, zIndex: 10 },
  
  toggleButton: { marginTop: 15, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: RESET_COLORS.typography, borderRadius: 4, alignSelf: 'center', borderWidth: 1, borderColor: '#FFF' },
  toggleText: { color: "#FFF", fontFamily: 'Archivo-SemiBold', fontSize: 14 },
});