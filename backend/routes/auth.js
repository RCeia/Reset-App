const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer'); // <--- NOVO IMPORT
const User = require('../models/User');
const Tag = require('../models/Tag');
const authenticate = require('../middleware/auth');

// ==========================================================
// 1. CONFIGURAÇÃO DO EMAIL (GMAIL)
// ==========================================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'reset.app.mail@gmail.com', // O teu email
    pass: 'jnla daud vsbp otpz'        // A tua senha de app
  }
});

// ==========================================================
// 2. CONFIGURAÇÃO DE UPLOAD (MULTER)
// ==========================================================
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

// ==========================================================
// 3. ROTAS DE AUTENTICAÇÃO EXISTENTES
// ==========================================================

// REGISTAR
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    // Verifica se já existe
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
      avatar: user.avatar ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(user.avatar)}` : '',
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

    user.avatar = req.file.path;
    await user.save();

    res.json({ success: true, avatar: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ==========================================================
// 4. NOVAS ROTAS DE RECUPERAÇÃO DE SENHA
// ==========================================================

// PEDIR O CÓDIGO (Envia o email)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Por segurança, às vezes diz-se que foi enviado mesmo que não exista, 
      // mas para debug vamos dizer a verdade:
      return res.status(404).json({ success: false, error: 'Email não registado.' });
    }

    // Gerar código de 6 dígitos
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // Guardar na BD (Expira em 1 hora)
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; 

    await user.save();

    // Enviar Email
    const mailOptions = {
      from: 'Reset App <reset.app.mail@gmail.com>',
      to: user.email,
      subject: '🔑 Recuperar Palavra-passe - Reset App',
      text: `Olá ${user.username}!\n\nRecebemos um pedido para restaurar a tua senha.\n\nO teu código de recuperação é:\n\n${token}\n\nEste código é válido por 1 hora.\nSe não foste tu, ignora este email.`
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Código enviado para o email!' });

  } catch (err) {
    console.error("Erro email:", err);
    res.status(500).json({ success: false, error: 'Erro ao enviar email.' });
  }
});

// REDEFINIR A SENHA (Usa o código e a nova senha)
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    // Procura utilizador com email + token correto + data de validade ok
    const user = await User.findOne({ 
      email, 
      resetPasswordToken: code, 
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Código inválido ou expirado.' });
    }

    // Encriptar a nova senha
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;

    // Limpar os tokens (já não são precisos)
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    res.json({ success: true, message: 'Senha alterada com sucesso!' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Erro ao alterar senha.' });
  }
});

module.exports = router;