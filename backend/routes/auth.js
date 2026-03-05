const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Tag = require('../models/Tag');
const authenticate = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'reset.app.mail@gmail.com',
    pass: 'jnla daud vsbp otpz'
  }
});

cloudinary.config({
  cloud_name: 'dwokngz0j',
  api_key: '628528295897577',
  api_secret: 'zG_xKM3E-v021N4a58Yisyefu9s'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'reset_app_avatars',
    format: async (req, file) => 'jpg',
    public_id: (req, file) => `avatar-${req.userId || 'anon'}-${Date.now()}`,
  },
});

const upload = multer({ storage });

router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email já registado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    // Procura a tag Geral
    const tagGeral = await Tag.findOne({ name: 'Geral' });
    
    const user = new User({ 
      email, 
      password: hashed, 
      username,
      tags: tagGeral ? [tagGeral._id] : []
    });

    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (err) {
    // ESTA LINHA É CRUCIAL: Vai mostrar o erro real nos logs do Render
    console.error("ERRO NO REGISTO:", err);
    res.status(400).json({ success: false, error: err.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: 'Credenciais inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user._id }, 'secret_key');
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false });
    res.json({ username: user.username, avatar: user.avatar || '' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.post('/upload-avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false });
    user.avatar = req.file.path;
    await user.save();
    res.json({ success: true, avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, error: 'Email não registado.' });
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; 
    await user.save();
    const mailOptions = {
      from: 'Reset App <reset.app.mail@gmail.com>',
      to: user.email,
      subject: '🔑 Recuperar Palavra-passe - Reset App',
      text: `Olá ${user.username}!\n\nO teu código é: ${token}`
    };
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Código enviado!' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const user = await User.findOne({ 
      email, 
      resetPasswordToken: code, 
      resetPasswordExpires: { $gt: Date.now() } 
    });
    if (!user) return res.status(400).json({ success: false, error: 'Código inválido ou expirado.' });
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;