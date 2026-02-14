const express = require('express');
const router = express.Router();
const Score = require('../models/Score'); // O seu modelo de Score
const User = require('../models/User');   // O seu modelo de User
const auth = require('../middleware/auth'); 

router.post('/update', auth, async (req, res) => {
  try {
    const { score } = req.body;
    const userId = req.userId; // O auth.js injeta isto!

    // 1. Procurar o utilizador para obter o username
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilizador não encontrado' });
    }

    const username = user.username;
    console.log(`🎮 Processando score para: ${username} (${score} pontos)`);

    // 2. Lógica de Recorde (Upsert)
    const existingRecord = await Score.findOne({ username });

    if (!existingRecord || score > existingRecord.score) {
      await Score.findOneAndUpdate(
        { username },
        { score, updatedAt: Date.now() },
        { upsert: true, new: true }
      );
      return res.json({ success: true, message: 'Novo Recorde Guardado!' });
    }

    res.json({ success: true, message: 'Pontuação recebida.' });

  } catch (err) {
    console.error("❌ Erro no score.js:", err);
    res.status(500).json({ success: false, error: 'Erro interno no servidor' });
  }
});
// backend/routes/score.js

// Rota: GET /api/score/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const topScores = await Score.find()
      .sort({ score: -1 }) // Ordena por score descendente
      .limit(10)           // Apenas os 10 melhores
      .select('username score -_id'); // Apenas traz username e score

    res.json(topScores);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter ranking' });
  }
});

module.exports = router;