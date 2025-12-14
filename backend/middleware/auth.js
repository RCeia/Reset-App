const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Caminho: ../models/User
const Chat = require('../models/Chat'); // Caminho: ../models/Chat
const Tag = require('../models/Tag');   // Caminho: ../models/Tag

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, 'secret_key', async (err, decoded) => {
        if (err) return res.status(401).json({ success: false, error: 'Invalid token' });
        
        const userId = decoded.id;
        req.userId = userId;

        // ==========================================
        // 🚨 NOVO: VERIFICAÇÃO DE PERMISSÃO DE CHAT
        // ==========================================
        
        // Esta rota é /chats/:id/messages (ou /chats/:id/algumacoisa)
        const isChatSpecificRoute = req.originalUrl.startsWith('/chats/') && req.params.id; 
        
        // NOTA: A rota GET /chats/ (listar todos) não é bloqueada aqui,
        // mas a rota GET /chats/:id/messages TEM DE ser bloqueada se não houver acesso.
        
        if (isChatSpecificRoute) {
            const chatId = req.params.id;
            
            // 1. Buscar o utilizador com as suas Tags e os Chats permitidos por essas Tags
            const user = await User.findById(userId).populate({
                path: 'tags',
                populate: {
                    path: 'allowedChats',
                    model: 'Chat'
                }
            }).lean();

            // 2. Buscar o Chat que o utilizador está a tentar aceder
            const chat = await Chat.findById(chatId).lean();
            if (!chat) return res.status(404).json({ success: false, error: 'Chat não encontrado.' });

            // 3. Verificar Permissão Direta (ID do utilizador está no array allowedUsers)
            const isDirectMember = chat.allowedUsers.map(id => id.toString()).includes(userId.toString());
            
            // 4. Verificar Permissão por Tag
            let hasTagPermission = false;
            if (user && user.tags) {
                for (const tag of user.tags) {
                    // Mapeamos os IDs dos chats permitidos pela tag e verificamos se o chat atual está lá
                    const allowedChatIds = tag.allowedChats.map(c => c._id.toString());
                    if (allowedChatIds.includes(chatId.toString())) {
                        hasTagPermission = true;
                        break;
                    }
                }
            }

            // 5. Bloqueio
            if (!isDirectMember && !hasTagPermission) {
                return res.status(403).json({ success: false, error: 'Acesso negado a este chat. (Sem Tag ou Membro)' });
            }
        }
        
        next();
    });
};