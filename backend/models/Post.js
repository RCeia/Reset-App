const mongoose = require('mongoose');

// Regras para os Comentários (Agora com Autor e Texto)
const CommentSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Regras para as Publicações
const PostSchema = new mongoose.Schema({
    imagePath: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Os likes agora são uma lista de IDs de quem gostou
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Os comentários usam as regras que criámos acima
    comments: [CommentSchema],
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);