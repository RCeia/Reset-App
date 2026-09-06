const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Importar Rotas e Modelos
const adminRoutes = require('./routes/admin');
const postRoutes = require('./routes/posts');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth'); 
const scoreRoutes = require('./routes/score'); // 🆕 Adicionado da versão nova
const { Message } = require('./models/Chat'); 

// ==========================================================
// 1. CONFIGURAÇÕES BASE (Variáveis do Docker)
// ==========================================================
// Mantivemos a estrutura do Docker para o Ngrok e MongoDB funcionarem!
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/myappdb';
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// ==========================================================
// 2. CONEXÃO MONGODB
// ==========================================================
mongoose.connect(MONGO_URI)
.then(() => console.log('📦 MongoDB Conectado com sucesso!'))
.catch(err => console.error('❌ Erro ao ligar ao Mongo:', err));

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
app.use('/api/score', scoreRoutes); // 🆕 Adicionado da versão nova

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
                // Mantemos o PUBLIC_URL (Ngrok) para funcionar via Internet
                avatarUrl = `${PUBLIC_URL}/uploads/${filename}`;
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
    console.log(`🔗 Porta Interna: ${PORT}`);
    console.log(`🔗 Acesso Público (Ngrok): ${PUBLIC_URL}`);
    console.log(`------------------------------------------\n`);
});

// 🆕 Captura erro se o porto estiver ocupado (Da versão nova)
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ ERRO: O porto ${PORT} já está a ser usado!`);
        console.log('💡 DICA: Como estás no Docker, usa o comando "docker compose restart backend" no terminal.\n');
        process.exit(1);
    }
});