// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Necessário para ler o ficheiro
const http = require('http');
const { Server } = require('socket.io');

// ==========================================================
// 1. LER O IP DIRETAMENTE DO CONFIG.TS DO FRONTEND
// ==========================================================
let SERVER_IP = '127.0.0.1'; // Fallback caso não encontre
const PORT = 3000;

try {
  // Ajuste este caminho se as pastas não estiverem lado a lado
  // Assume estrutura:
  // 📁 /Projetos
  //    ├── 📁 Reset-App (Frontend)
  //    │     └── constants/Config.ts
  //    └── 📁 backend (Onde está este ficheiro)
  const configPath = path.join(__dirname, '../Reset-App/constants/Config.ts');
  
  if (fs.existsSync(configPath)) {
    const fileContent = fs.readFileSync(configPath, 'utf8');
    // Procura por: const SERVER_IP = "192.168.X.X";
    const match = fileContent.match(/SERVER_IP\s*=\s*["']([^"']+)["']/);
    if (match && match[1]) {
      SERVER_IP = match[1];
      console.log(`✅ Configuração carregada do Frontend: IP ${SERVER_IP}`);
    }
  } else {
    console.warn(`⚠️ Aviso: Não encontrei o ficheiro em: ${configPath}`);
  }
} catch (error) {
  console.error("Erro ao ler Config.ts:", error.message);
}
// ==========================================================

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

// serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mongo
mongoose.connect('mongodb://127.0.0.1:27017/myappdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schemas (Mantidos iguais)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true, default: 'User' },
  avatar: { type: String, default: '' },
});
const User = mongoose.model('User', UserSchema);

const PostSchema = new mongoose.Schema({
  imagePath: { type: String, required: true }, 
  likes: { type: Number, default: 0 },
  comments: { type: [String], default: [] },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
});
const Post = mongoose.model('Post', PostSchema);

// Auth middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, 'secret_key', (err, decoded) => {
    if (err) return res.status(401).json({ success: false });
    req.userId = decoded.id;
    next();
  });
};

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.userId || 'anon'}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ---------- AUTH endpoints ----------
app.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed, username });
    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false });

    const token = jwt.sign({ id: user._id }, 'secret_key');
    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false });

    res.json({
      username: user.username,
      avatar: user.avatar ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(user.avatar)}` : '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post('/upload-avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false });

    user.avatar = req.file.path;
    await user.save();

    res.json({ success: true, avatar: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ---------- POSTS endpoints ----------
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('author', 'username avatar')
      .lean();

    const mapped = posts.map(p => ({
      id: p._id,
      imageUrl: `${req.protocol}://${req.get('host')}/uploads/${path.basename(p.imagePath)}`,
      likes: p.likes,
      comments: p.comments,
      createdAt: p.createdAt,
      author: {
        username: p.author?.username || 'Unknown',
        avatar: p.author?.avatar
          ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(p.author.avatar)}`
          : '',
      },
    }));

    res.json({ success: true, posts: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post('/posts', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Image required' });

    const post = new Post({
      imagePath: req.file.path,
      author: req.userId,
    });

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username avatar')
      .lean();

    const payload = {
      id: populatedPost._id,
      imageUrl: `${req.protocol}://${req.get('host')}/uploads/${path.basename(populatedPost.imagePath)}`,
      likes: populatedPost.likes,
      comments: populatedPost.comments,
      createdAt: populatedPost.createdAt,
      author: {
        username: populatedPost.author?.username || 'Unknown',
        avatar: populatedPost.author?.avatar
          ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(populatedPost.author.avatar)}`
          : '',
      },
    };

    io.emit('new_post', payload);
    res.json({ success: true, post: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post('/posts/:id/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false });
    post.likes = (post.likes || 0) + 1;
    await post.save();

    const updated = { id: post._id, likes: post.likes };
    io.emit('post_liked', updated);
    res.json({ success: true, likes: post.likes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post('/posts/:id/comment', authenticate, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ success: false });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false });
    post.comments.push(comment);
    await post.save();

    io.emit('post_commented', { id: post._id, comment });
    res.json({ success: true, comments: post.comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

// ---------- CHAT/MESSAGES SCHEMA ----------
const ChatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});
const Chat = mongoose.model('Chat', ChatSchema);

const MessageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', MessageSchema);

// ---------- CHAT ENDPOINTS ----------
app.get('/chats', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({ allowedUsers: req.userId }).lean();
    res.json({ success: true, chats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.get('/chats/:id/messages', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    if (!chat.allowedUsers.includes(req.userId))
      return res.status(403).json({ success: false, error: 'Access denied' });

    const messages = await Message.find({ chat: chat._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'username avatar')
      .lean();

    const mapped = messages.map(m => ({
      id: m._id,
      chatId: m.chat,
      text: m.text,
      createdAt: m.createdAt,
      sender: {
        username: m.sender.username,
        avatar: m.sender.avatar ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(m.sender.avatar)}` : '',
      },
    }));

    res.json({ success: true, messages: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ---------- SOCKET.IO CHAT ----------
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join_chat', async ({ chatId, userId }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;
      if (!chat.allowedUsers.includes(userId)) return;
      socket.join(chatId);
      console.log(`Socket ${socket.id} joined chat ${chatId}`);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('send_message', async ({ chatId, userId, text }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.allowedUsers.includes(userId)) return;

      const message = new Message({ chat: chatId, sender: userId, text });
      await message.save();

      const populated = await message.populate('sender', 'username avatar');

      // 2. USAR O IP EXTRAÍDO DO FICHEIRO PARA AS IMAGENS DO CHAT
      const serverBase = `http://${SERVER_IP}:${PORT}`;

      const payload = {
        id: message._id,
        chatId,
        text: message.text,
        createdAt: message.createdAt,
        sender: {
          username: populated.sender.username,
          avatar: populated.sender.avatar
            ? `${serverBase}/uploads/${path.basename(populated.sender.avatar)}`
            : '',
        },
      };

      io.to(chatId).emit('new_message', payload);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

// 3. INICIAR O SERVIDOR NO 0.0.0.0 (Ouve todos os IPs)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend a correr em http://0.0.0.0:${PORT}`);
  console.log(`📡 Acessível na rede (Config.ts) via: http://${SERVER_IP}:${PORT}`);
});