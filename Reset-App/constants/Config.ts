import { Platform } from 'react-native';

const SERVER_IP = '192.168.1.39'; // O teu IP atual
const PORT = '3000';

export const BASE_URL = Platform.OS === 'web'
  ? `http://localhost:${PORT}`       // Se for Web, usa localhost
  : `http://${SERVER_IP}:${PORT}`;   // Se for Android/iOS, usa o IP da rede