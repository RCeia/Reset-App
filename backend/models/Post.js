const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  imagePath: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Autor do Post
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Autor do Comentário (IGUAL AO ACIMA)
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', PostSchema);