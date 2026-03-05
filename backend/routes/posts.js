const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');
const authenticate = require('../middleware/auth');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (!ext) {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else ext = '.jpg'; 
    }
    cb(null, `${req.userId || 'post'}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

router.get('/', authenticate, async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('author', 'username avatar') 
            .populate('comments.user', 'username avatar') 
            .lean();

        const mapped = posts.map(p => {
            const getUrl = (s) => s ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(s)}` : '';

            return {
                id: p._id,
                imageUrl: getUrl(p.imagePath),
                likes: p.likes.length,
                likedByMe: p.likes.some(id => id.toString() === req.userId),
                author: {
                    username: p.author?.username || 'User',
                    avatar: getUrl(p.author?.avatar),
                },
                comments: (p.comments || []).map(c => ({
                    text: c.text,
                    username: c.user?.username || 'Utilizador',
                    avatar: getUrl(c.user?.avatar)
                }))
            };
        });
        res.json({ success: true, posts: mapped });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Imagem em falta' });
        }

        const newPost = new Post({
            author: req.userId,
            imagePath: req.file.path,
            likes: [],
            comments: []
        });

        await newPost.save();

        const populatedPost = await Post.findById(newPost._id)
            .populate('author', 'username avatar')
            .lean();

        const getUrl = (s) => s ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(s)}` : '';

        const mappedPost = {
            id: populatedPost._id,
            imageUrl: getUrl(populatedPost.imagePath),
            likes: 0,
            likedByMe: false,
            author: {
                username: populatedPost.author?.username || 'User',
                avatar: getUrl(populatedPost.author?.avatar),
            },
            comments: []
        };

        req.app.get('io').emit('new_post', mappedPost);

        res.json({ success: true, post: mappedPost });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/:id/comment', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        post.comments.push({ user: req.userId, text: req.body.comment });
        await post.save();
        req.app.get('io').emit('post_commented', { id: post._id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/:id/like', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const index = post.likes.indexOf(req.userId);
        if (index === -1) {
            post.likes.push(req.userId);
        } else {
            post.likes.splice(index, 1);
        }
        await post.save();
        req.app.get('io').emit('post_liked', { id: post._id, likes: post.likes.length });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;