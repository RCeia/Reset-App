const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const fs = require('fs'); 
const { Server } = require('socket.io');

// Importar Rotas e Modelos
// Nota: O authenticate não é usado diretamente aqui, mas sim nas rotas
const adminRoutes = require('./routes/admin');
const postRoutes = require('./routes/posts');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth'); // Importante ter isto
const { Message } = require('./models/Chat'); 

// ==========================================================
// 1. CONFIGURAÇÃO DE IP (Para a imagem aparecer no Telemóvel)
// ==========================================================
let SERVER_IP = '127.0.0.1'; 
const PORT = 3000;

try {
  // Tenta ler o IP do ficheiro de configuração do Frontend para ficarem iguais
  // Ajuste o caminho se a pasta estiver noutro sítio
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

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Guardar o 'io' para usar nas rotas (útil para notificações)
app.set('io', io);

app.use(cors());
app.use(express.json());
// Esta linha permite que o link http://.../uploads/foto.png funcione
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conexão DB
mongoose.connect('mongodb://127.0.0.1:27017/myappdb', {
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('📦 MongoDB Conectado'))
.catch(err => console.error('Erro Mongo:', err));

// ================= ROTAS =================
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/posts', postRoutes);
app.use('/chats', chatRoutes);
// =========================================

// ================= SOCKET (A MÁGICA DO TEMPO REAL) =================
io.on('connection', (socket) => {
    console.log('🔌 Socket conectado:', socket.id);

    socket.on('join_chat', ({ chatId }) => socket.join(chatId));

    socket.on('send_message', async ({ chatId, userId, text }) => {
        try {
            // 1. Gravar a mensagem na base de dados
            const message = new Message({ chat: chatId, sender: userId, text });
            await message.save();

            // 2. Buscar os dados completos do remetente (Nome e Foto)
            const populated = await Message.findById(message._id)
                .populate('sender', 'username avatar')
                .lean();

            // 3. 🚨 O TRUQUE: Construir o Link da Imagem AGORA 🚨
            // Se não fizermos isto aqui, o frontend recebe "uploads/foto.png" e não sabe abrir
            let avatarUrl = '';
            if (populated.sender.avatar) {
                const filename = path.basename(populated.sender.avatar);
                // Cria o link: http://192.168.1.X:3000/uploads/foto.png
                avatarUrl = `http://${SERVER_IP}:${PORT}/uploads/${filename}`;
            }

            // 4. Enviar a mensagem "pronta a consumir" para o Frontend
            io.to(chatId).emit('new_message', {
                id: populated._id,
                chatId: populated.chat,
                text: populated.text,
                createdAt: populated.createdAt,
                sender: {
                    _id: populated.sender._id,
                    username: populated.sender.username,
                    avatar: avatarUrl // ✅ Link perfeito!
                }
            });

        } catch (err) {
            console.error("Erro ao enviar mensagem:", err);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor a bombar em: http://${SERVER_IP}:${PORT}`);
});