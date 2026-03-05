const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Importar Rotas
const adminRoutes = require('./routes/admin');
const postRoutes = require('./routes/posts');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth'); 
const { Message } = require('./models/Chat');
const scoreRoutes = require('./routes/score');

// 1. CONFIGURAÇÃO DE PORTA (O Render define a porta automaticamente)
const PORT = process.env.PORT || 3000;

// 2. CONEXÃO MONGODB ATLAS
const mongoURI = 'mongodb+srv://rodrigoceia7337_db_user:NfyRBrvmUOu5cFRV@cluster0.x0vhis0.mongodb.net/resetdb?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
.then(() => console.log('📦 MongoDB ATLAS Conectado com sucesso!'))
.catch(err => console.error('❌ Erro ao ligar ao Mongo ATLAS:', err));

// 3. CONFIGURAÇÃO DO EXPRESS E SOCKET.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('io', io);

app.use(cors());
app.use(express.json());

// 4. ROTAS
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/posts', postRoutes);
app.use('/chats', chatRoutes);
app.use('/api/score', scoreRoutes);

// 5. SOCKET (TEMPO REAL)
io.on('connection', (socket) => {
    socket.on('join_chat', ({ chatId }) => socket.join(chatId));

    socket.on('send_message', async ({ chatId, userId, text }) => {
        try {
            const message = new Message({ chat: chatId, sender: userId, text });
            await message.save();

            const populated = await Message.findById(message._id)
                .populate('sender', 'username avatar')
                .lean();

            // Com Cloudinary, o avatar já é um URL completo (http...)
            const avatarUrl = populated.sender?.avatar || '';

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

// 6. INICIALIZAÇÃO
server.listen(PORT, () => {
    console.log(`🚀 SERVIDOR ONLINE NA PORTA ${PORT}`);
});