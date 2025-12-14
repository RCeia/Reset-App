// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
// IMPORTANTE: Precisamos importar Message também para poder apagar as mensagens
const { Chat, Message } = require('../models/Chat'); 

// ==========================================
// 👤 ROTAS DE USERS
// ==========================================
router.get('/users', async (req, res) => {
    const users = await User.find().select('-password');
    res.json(users);
});

router.put('/users/:id', async (req, res) => {
    const { username, email } = req.body;
    await User.findByIdAndUpdate(req.params.id, { username, email });
    res.json({ success: true });
});

router.delete('/users/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// ==========================================
// 📝 ROTAS DE POSTS
// ==========================================
router.get('/posts', async (req, res) => {
    const posts = await Post.find().populate('author', 'username');
    res.json(posts);
});

router.delete('/posts/:id', async (req, res) => {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// ==========================================
// 💬 ROTAS DE CHATS (SOCKET ATIVADO 🚀)
// ==========================================

// 1. Ver todos os chats
router.get('/chats', async (req, res) => {
    try {
        const chats = await Chat.find().populate('allowedUsers', 'username email');
        res.json(chats);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Editar Chat Existente
router.put('/chats/:id', async (req, res) => {
    try {
        const { name, allowedUsers } = req.body; 
        
        // Atualiza no DB
        await Chat.findByIdAndUpdate(req.params.id, { name, allowedUsers });
        
        // Opcional: Podia emitir um 'chat_updated' aqui se quisesse ser perfeccionista,
        // mas para já o reload resolve a edição.
        
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Criar Novo Chat (AGORA COM AVISO SOCKET)
router.post('/chats', async (req, res) => {
    try {
        const { name, allowedUsers } = req.body;
        
        // 1. Criar
        const newChat = new Chat({ name, allowedUsers });
        await newChat.save();

        // 2. Popular (Necessário para o telemóvel mostrar nomes/avatares imediatamente)
        const populatedChat = await Chat.findById(newChat._id)
            .populate('allowedUsers', 'username email avatar');

        // 3. 🚨 AVISAR O MUNDO VIA SOCKET 🚨
        const io = req.app.get('io');
        if (io) {
            io.emit('chat_created', populatedChat);
        }

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Apagar Chat (AGORA SEGURO)
router.delete('/chats/:id', async (req, res) => {
    try {
        const chatId = req.params.id;

        // 1. Apagar Chat e Mensagens associadas
        await Chat.findByIdAndDelete(chatId);
        await Message.deleteMany({ chat: chatId }); // Agora funciona porque importámos Message lá em cima

        // 2. 🚨 AVISAR O MUNDO VIA SOCKET 🚨
        const io = req.app.get('io');
        if (io) {
            io.emit('chat_deleted', chatId);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;