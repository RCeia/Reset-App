// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const path = require('path');

// IMPORTAR MODELOS E MIDDLEWARE
const { Chat, Message } = require('../models/Chat');
const authenticate = require('../middleware/auth');

const User = require('../models/User'); // Precisamos disto para ler as tags
const Tag = require('../models/Tag');

// backend/routes/chat.js

// 1. Listar Chats (AGORA COM LÓGICA DE TAGS)
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.userId;

        // 1. Buscar o Utilizador e popular as Tags e os Chats que essas Tags permitem.
        const user = await User.findById(userId)
            .populate({
                path: 'tags',
                populate: {
                    path: 'allowedChats',
                    model: 'Chat' // Certifique-se que o nome do modelo é 'Chat'
                }
            })
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilizador não encontrado.' });
        }

        // 2. Coletar os IDs de todos os chats permitidos pelas Tags
        let chatIdsFromTags = [];
        if (user.tags && user.tags.length > 0) {
            user.tags.forEach(tag => {
                if (tag.allowedChats) {
                    // Mapeia os IDs dos chats permitidos por esta tag
                    const tagChats = tag.allowedChats.map(chat => chat._id);
                    chatIdsFromTags.push(...tagChats);
                }
            });
        }
        
        // Remover duplicados (se o mesmo chat for permitido diretamente e por várias tags)
        const uniqueTagChatIds = [...new Set(chatIdsFromTags)];

        // 3. Criar a query de busca (OR logic)
        // O utilizador tem acesso se:
        // A. O ID dele está em allowedUsers OU
        // B. O ID do chat está na lista de chats permitidos pelas Tags
        const chats = await Chat.find({
            $or: [
                { allowedUsers: userId },            // Condição A: Membro direto
                { _id: { $in: uniqueTagChatIds } }   // Condição B: Permitido por Tag
            ]
        })
        .populate('allowedUsers', 'username avatar');
        
        res.json({ success: true, chats });

    } catch (err) {
        console.error("Erro ao listar chats:", err);
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