// constants/Config.ts

// Coloque aqui o IP V4 da sua máquina Windows (o tal 192.168...)
// Dica: No terminal wsl, corra "ipconfig.exe" para ver este número.
const SERVER_IP = "192.168.1.132"; 
const PORT = "3000";

// Se for usar o emulador Android no PC, ele precisa deste IP especial:
// const SERVER_IP = "10.0.2.2"; 

export const BASE_URL = `http://${SERVER_IP}:${PORT}`;