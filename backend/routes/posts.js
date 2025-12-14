const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Post = require('../models/Post');
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

// LISTAR POSTS
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 }).limit(100).populate('author', 'username avatar').lean();
        
        const mapped = posts.map(p => ({
            id: p._id,
            imageUrl: `${req.protocol}://${req.get('host')}/uploads/${path.basename(p.imagePath)}`,
            likes: p.likes,
            comments: p.comments,
            createdAt: p.createdAt,
            author: {
                username: p.author?.username || 'Unknown',
                avatar: p.author?.avatar ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(p.author.avatar)}` : '',
            },
        }));
        res.json({ success: true, posts: mapped });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CRIAR POST
router.post('/', authenticate, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Image required' });
        const post = new Post({ imagePath: req.file.path, author: req.userId });
        await post.save();
        
        // Populate para enviar via Socket
        const populatedPost = await Post.findById(post._id).populate('author', 'username avatar').lean();
        
        // Prepara objeto igual ao GET
        const payload = {
            id: populatedPost._id,
            imageUrl: `${req.protocol}://${req.get('host')}/uploads/${path.basename(populatedPost.imagePath)}`,
            likes: populatedPost.likes,
            comments: populatedPost.comments,
            createdAt: populatedPost.createdAt,
            author: {
                username: populatedPost.author?.username || 'Unknown',
                avatar: populatedPost.author?.avatar ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(populatedPost.author.avatar)}` : '',
            },
        };

        const io = req.app.get('io');
        io.emit('new_post', payload);
        res.json({ success: true, post: payload });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// LIKE POST
router.post('/:id/like', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false });
        
        post.likes = (post.likes || 0) + 1;
        await post.save();
        
        const io = req.app.get('io');
        io.emit('post_liked', { id: post._id, likes: post.likes });
        res.json({ success: true, likes: post.likes });
    } catch (err) { res.status(500).json({ success: false }); }
});

// COMENTAR POST - FALTAVA ISTO
router.post('/:id/comment', authenticate, async (req, res) => {
    try {
        const { comment } = req.body;
        if (!comment) return res.status(400).json({ success: false });
        
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false });
        
        post.comments.push(comment);
        await post.save();
    
        const io = req.app.get('io');
        io.emit('post_commented', { id: post._id, comment });
        res.json({ success: true, comments: post.comments });
    } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;