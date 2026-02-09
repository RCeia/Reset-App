import { Platform } from 'react-native';

//<<<<<<< HEAD
// Coloque aqui o IP V4 da sua máquina Windows (o tal 192.168...)
// Dica: No terminal wsl, corra "ipconfig.exe" para ver este número.
//const SERVER_IP = "192.168.1.88"; 
//const SERVER_IP = "192.168.1.71";

//const SERVER_IP = '192.168.1.132'; // O teu IP atual
const SERVER_IP = '192.168.1.243';
const PORT = '3001';

export const BASE_URL = Platform.OS === 'web'
  ? `http://localhost:${PORT}`       // Se for Web, usa localhost
  : `http://${SERVER_IP}:${PORT}`;   // Se for Android/iOS, usa o IP da rede