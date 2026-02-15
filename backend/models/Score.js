const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  score: { type: Number, required: true, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Score', ScoreSchema);