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

// ==========================================================
// 1. CONFIGURAÇÃO DO EMAIL (GMAIL)
// ==========================================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'reset.app.mail@gmail.com',
    pass: 'jnla daud vsbp otpz'
  }
});

// ==========================================================
// 2. CONFIGURAÇÃO DO CLOUDINARY E MULTER
// ==========================================================
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

// ==========================================================
// 3. ROTAS DE AUTENTICAÇÃO
// ==========================================================

// REGISTAR
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email já registado' });
    }

    const hashed = await bcrypt.hash(password, 10);
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

// ME (Dados do utilizador logado)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false });

    res.json({
      username: user.username,
      avatar: user.avatar || '', // O avatar já é o URL completo do Cloudinary
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// UPLOAD AVATAR
router.post('/upload-avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false });

    // Guardamos o URL público que o Cloudinary devolve
    user.avatar = req.file.path;
    await user.save();

    res.json({ success: true, avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ==========================================================
// 4. ROTAS DE RECUPERAÇÃO DE SENHA
// ==========================================================

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
      text: `Olá ${user.username}!\n\nRecebemos um pedido para restaurar a tua senha.\n\nO teu código de recuperação é:\n\n${token}\n\nEste código é válido por 1 hora.`
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Código enviado para o email!' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao enviar email.' });
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
    res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao alterar senha.' });
  }
});

module.exports = router;