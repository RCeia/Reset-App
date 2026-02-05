import { Platform } from 'react-native';

const SERVER_IP = '192.168.1.132'; // O teu IP atual
const PORT = '3001';

export const BASE_URL = Platform.OS === 'web'
  ? `http://localhost:${PORT}`       // Se for Web, usa localhost
  : `http://${SERVER_IP}:${PORT}`;   // Se for Android/iOS, usa o IP da rede