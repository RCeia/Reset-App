const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Ou 'bcrypt' dependendo do que usas
const User = require('../models/User');
const Post = require('../models/Post');
const { Chat, Message } = require('../models/Chat');
const Tag = require('../models/Tag');

const JWT_SECRET = 'MUDA_ISTO_PARA_ALGO_SECRETO_NO_ENV'; 

// ==========================================
// 🔐 MIDDLEWARE DE SEGURANÇA
// ==========================================
const verificarAdmin = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: 'Nenhum token fornecido.' });
    }

    try {
        // Remove "Bearer " se vier no header
        const tokenLimpo = token.replace('Bearer ', '');
        const decoded = jwt.verify(tokenLimpo, JWT_SECRET);
        
        if (!decoded.isAdmin) {
            return res.status(401).json({ error: 'Acesso negado. Não é administrador.' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido.' });
    }
};

// ==========================================
// 🚪 ROTA DE LOGIN (PÚBLICA)
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 1. Procurar user
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

        // 2. Verificar se é Admin
        if (!user.isAdmin) return res.status(403).json({ error: 'Não tem permissões de administrador.' });

        // 3. Verificar password
        const passwordValida = await bcrypt.compare(password, user.password);
        if (!passwordValida) return res.status(401).json({ error: 'Password incorreta.' });

        // 4. Gerar Token
        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ success: true, token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// APLICAR SEGURANÇA EM TUDO O QUE ESTÁ ABAIXO
router.use(verificarAdmin);


// ==========================================
// 🏷️ ROTAS DE GESTÃO DE TAGS
// ==========================================
router.get('/tags', async (req, res) => {
    try {
        const tags = await Tag.find().populate('allowedChats', 'name').lean();
        res.json(tags);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tags', async (req, res) => {
    try {
        const { name, allowedChats } = req.body;
        const newTag = new Tag({ name, allowedChats });
        await newTag.save();
        res.json({ success: true, tag: newTag });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/tags/:id', async (req, res) => {
    try {
        const { name, allowedChats } = req.body;
        await Tag.findByIdAndUpdate(req.params.id, { name, allowedChats });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/tags/:id', async (req, res) => {
    try {
        await Tag.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==========================================
// 👤 ROTAS DE USERS
// ==========================================
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password').populate('tags', 'name');
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/users/:id', async (req, res) => {
    try {
        const { username, email, tags } = req.body;
        await User.findByIdAndUpdate(req.params.id, { username, email, tags });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==========================================
// 📝 ROTAS DE POSTS
// ==========================================
router.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find().populate('author', 'username');
        res.json(posts);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/posts/:id', async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==========================================
// 💬 ROTAS DE CHATS
// ==========================================
router.get('/chats', async (req, res) => {
    try {
        const chats = await Chat.find().populate('allowedUsers', 'username email');
        res.json(chats);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/chats/:id', async (req, res) => {
    try {
        const { name, allowedUsers } = req.body; 
        await Chat.findByIdAndUpdate(req.params.id, { name, allowedUsers });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/chats', async (req, res) => {
    try {
        const { name, allowedUsers } = req.body;
        
        const newChat = new Chat({ name, allowedUsers });
        await newChat.save();

        const populatedChat = await Chat.findById(newChat._id)
            .populate('allowedUsers', 'username email avatar');

        const io = req.app.get('io');
        if (io) io.emit('chat_created', populatedChat);

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/chats/:id', async (req, res) => {
    try {
        const chatId = req.params.id;
        await Chat.findByIdAndDelete(chatId);
        await Message.deleteMany({ chat: chatId });

        const io = req.app.get('io');
        if (io) io.emit('chat_deleted', chatId);

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;