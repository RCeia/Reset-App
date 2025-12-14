// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const path = require('path');

// IMPORTAR MODELOS E MIDDLEWARE
const { Chat, Message } = require('../models/Chat');
const authenticate = require('../middleware/auth');

// 1. Listar Chats
router.get('/', authenticate, async (req, res) => {
    try {
        const chats = await Chat.find({ allowedUsers: req.userId })
            .populate('allowedUsers', 'username avatar'); 
        res.json({ success: true, chats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Carregar Histórico (COM A LÓGICA DE URL)
router.get('/:id/messages', authenticate, async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.id })
            .sort({ createdAt: 1 })
            .populate('sender', 'username avatar')
            .lean();

        // Transforma caminhos de ficheiro em Links URL
        const messagesWithUrl = messages.map(msg => {
            if (msg.sender && msg.sender.avatar) {
                const filename = path.basename(msg.sender.avatar);
                // Constrói o link completo
                msg.sender.avatar = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
            }
            return msg;
        });
            
        res.json({ success: true, messages: messagesWithUrl });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 3. Criar Novo Chat (AGORA COM AVISO EM TEMPO REAL 🚀)
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, allowedUsers } = req.body;
        const finalUsers = [...new Set([...allowedUsers, req.userId])]; // Garante unicidade
        
        // 1. Gravar na DB
        const chat = new Chat({ name, allowedUsers: finalUsers });
        await chat.save();

        // 2. Buscar dados completos (Para o frontend saber quem está no chat)
        const populatedChat = await Chat.findById(chat._id)
            .populate('allowedUsers', 'username avatar');

        // 3. AVISAR O MUNDO (SOCKET)
        const io = req.app.get('io'); // Vai buscar o socket guardado no server.js
        if (io) {
            io.emit('chat_created', populatedChat); // <--- O telemóvel ouve isto e atualiza a lista!
        }

        res.json({ success: true, chat: populatedChat });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;