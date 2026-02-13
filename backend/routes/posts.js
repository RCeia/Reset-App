const express = require('express');
const router = express.Router();
const path = require('path');
const Post = require('../models/Post');
const authenticate = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

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
                    avatar: getUrl(c.user?.avatar) // FOTO VIVA!
                }))
            };
        });
        res.json({ success: true, posts: mapped });
    } catch (err) { res.status(500).json({ error: err.message }); }
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

module.exports = router;