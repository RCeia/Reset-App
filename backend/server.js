const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const fs = require('fs'); 
const { Server } = require('socket.io');

// Importar Rotas e Modelos
const adminRoutes = require('./routes/admin');
const postRoutes = require('./routes/posts');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth'); 
const { Message } = require('./models/Chat');
const scoreRoutes = require('./routes/score');

// ==========================================================
// 1. CONFIGURAÇÃO DE IP (Sincronização com o Frontend)
// ==========================================================
let SERVER_IP = '127.0.0.1'; 
const PORT = 3001;

try {
  // Tenta ler o IP do ficheiro de configuração do Frontend
  const configPath = path.join(__dirname, '../Reset-App/constants/Config.ts');
  
  if (fs.existsSync(configPath)) {
    const fileContent = fs.readFileSync(configPath, 'utf8');
    const match = fileContent.match(/SERVER_IP\s*=\s*["']([^"']+)["']/);
    if (match && match[1]) {
      SERVER_IP = match[1];
      console.log(`✅ IP sincronizado com Config.ts: ${SERVER_IP}`);
    }
  }
} catch (error) { 
    console.log('⚠️ Não consegui ler o Config.ts, usando localhost'); 
}

// ==========================================================
// 2. CONEXÃO MONGODB (Versão Limpa sem Warnings)
// ==========================================================
mongoose.connect('mongodb://127.0.0.1:27017/myappdb')
.then(() => console.log('📦 MongoDB LOCAL Conectado com sucesso!'))
.catch(err => console.error('❌ Erro ao ligar ao Mongo LOCAL:', err));

// ==========================================================
// 3. CONFIGURAÇÃO DO EXPRESS E SOCKET.IO
// ==========================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Guardar o 'io' para usar nas rotas
app.set('io', io);

app.use(cors());
app.use(express.json());
// Servir ficheiros estáticos (Uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================= ROTAS =================
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/posts', postRoutes);
app.use('/chats', chatRoutes);
app.use('/api/score', scoreRoutes);

// ================= SOCKET (TEMPO REAL) =================
io.on('connection', (socket) => {
    console.log('🔌 Socket conectado:', socket.id);

    socket.on('join_chat', ({ chatId }) => socket.join(chatId));

    socket.on('send_message', async ({ chatId, userId, text }) => {
        try {
            // 1. Gravar a mensagem na base de dados
            const message = new Message({ chat: chatId, sender: userId, text });
            await message.save();

            // 2. Buscar os dados completos do remetente
            const populated = await Message.findById(message._id)
                .populate('sender', 'username avatar')
                .lean();

            // 3. Construir o Link da Imagem para o Frontend
            let avatarUrl = '';
            if (populated.sender && populated.sender.avatar) {
                const filename = path.basename(populated.sender.avatar);
                avatarUrl = `http://${SERVER_IP}:${PORT}/uploads/${filename}`;
            }

            // 4. Enviar para o Frontend
            io.to(chatId).emit('new_message', {
                id: populated._id,
                chatId: populated.chat,
                text: populated.text,
                createdAt: populated.createdAt,
                sender: {
                    _id: populated.sender._id,
                    username: populated.sender.username,
                    avatar: avatarUrl
                }
            });

        } catch (err) {
            console.error("Erro ao enviar mensagem:", err);
        }
    });
});

// ==========================================================
// 4. INICIALIZAÇÃO COM TRATAMENTO DE ERRO DE PORTA
// ==========================================================
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SERVIDOR ONLINE`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log(`🔗 Rede:  http://${SERVER_IP}:${PORT}`);
    console.log(`------------------------------------------\n`);
});

// Captura erro se o porto estiver ocupado
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ ERRO: O porto ${PORT} já está a ser usado!`);
        console.log('💡 RESOLUÇÃO: Executa "taskkill.exe /F /IM node.exe" no teu terminal.\n');
        process.exit(1);
    }
});