const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

// Configuração do Multer (Igual ao que estava no server.js)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.userId || 'anon'}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// REGISTAR
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed, username });
    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Registration failed' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false });

    const token = jwt.sign({ id: user._id }, 'secret_key');
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ME (Dados do utilizador logado) - FALTAVA ISTO
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false });

    res.json({
      username: user.username,
      avatar: user.avatar ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(user.avatar)}` : '',
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// UPLOAD AVATAR - FALTAVA ISTO
router.post('/upload-avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false });

    user.avatar = req.file.path;
    await user.save();

    res.json({ success: true, avatar: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;