const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Post = require('../models/Post');
const User = require('../models/User'); // Precisamos disto para os comentários
const authenticate = require('../middleware/auth');

// Configuração Multer para Posts
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `${req.userId}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// FUNÇÃO AUXILIAR: Formatar os Posts para o Frontend
const formatPostForFrontend = (req, post, userId) => {
    const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
    const isLikedByMe = Array.isArray(post.likes) && post.likes.some(id => id.toString() === userId.toString());

    // 🛡️ NOVO: Tratamento de Comentários Resistente a Falhas
    const formattedComments = (post.comments || []).map(c => {
        // Cenário 1: Comentário antigo (apenas texto puro na base de dados)
        if (typeof c === 'string') {
            return {
                id: Math.random().toString(),
                comment: c,
                author: { username: 'Visitante Antigo', avatar: '' }
            };
        }
        
        // Cenário 2: Comentário novo, mas falta a informação do utilizador
        const authorObj = (c.author && typeof c.author === 'object' && c.author.username) 
            ? c.author 
            : { username: 'Desconhecido', avatar: '' };

        return {
            id: c._id,
            comment: c.comment || c.text || '',
            createdAt: c.createdAt,
            author: {
                username: authorObj.username,
                avatar: authorObj.avatar ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(authorObj.avatar)}` : '',
            }
        };
    });

    return {
        id: post._id,
        imageUrl: `${req.protocol}://${req.get('host')}/uploads/${path.basename(post.imagePath)}`,
        likes: likesCount,
        likedByMe: isLikedByMe,
        createdAt: post.createdAt,
        author: {
            username: post.author?.username || 'Unknown',
            avatar: post.author?.avatar ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(post.author.avatar)}` : '',
        },
        comments: formattedComments
    };
};

// LISTAR POSTS
router.get('/', authenticate, async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('author', 'username avatar')
            .populate('comments.author', 'username avatar') // Faltava isto para os comentários!
            .lean();
        
        const mapped = posts.map(p => formatPostForFrontend(req, p, req.userId));
        res.json({ success: true, posts: mapped });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CRIAR POST
router.post('/', authenticate, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Image required' });
        const post = new Post({ imagePath: req.file.path, author: req.userId, likes: [], comments: [] });
        await post.save();
        
        const populatedPost = await Post.findById(post._id)
            .populate('author', 'username avatar')
            .lean();
        
        const payload = formatPostForFrontend(req, populatedPost, req.userId);

        const io = req.app.get('io');
        io.emit('new_post', payload);
        res.json({ success: true, post: payload });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// LIKE POST (TIRAR OU METER)
router.post('/:id/like', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false });
        
        // Garante que é um array
        if (!Array.isArray(post.likes)) post.likes = [];

        // O SEGREDO DO TOGGLE:
        const userIdStr = req.userId.toString();
        const hasLikedIndex = post.likes.findIndex(id => id.toString() === userIdStr);

        if (hasLikedIndex > -1) {
            // Se já deu like, retira
            post.likes.splice(hasLikedIndex, 1);
        } else {
            // Se não deu, adiciona
            post.likes.push(req.userId);
        }

        await post.save();
        
        // Emite apenas o número total atualizado
        const io = req.app.get('io');
        io.emit('post_liked', { id: post._id, likes: post.likes.length });
        
        res.json({ success: true, likes: post.likes.length });
    } catch (err) { res.status(500).json({ success: false }); }
});

// COMENTAR POST
router.post('/:id/comment', authenticate, async (req, res) => {
    try {
        const { comment } = req.body;
        if (!comment) return res.status(400).json({ success: false });
        
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false });
        
        // Em vez de puxar só o texto, gravamos um objeto completo!
        const newComment = {
            author: req.userId,
            comment: comment,
            createdAt: new Date()
        };

        // Garante que é um array
        if (!Array.isArray(post.comments)) post.comments = [];
        
        post.comments.push(newComment);
        await post.save();
    
        const io = req.app.get('io');
        // Ao enviar um sinal de reload, os clientes vão buscar o post já "populado"
        io.emit('post_commented'); 
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;