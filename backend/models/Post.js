const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  imagePath: { type: String, required: true }, 
  likes: { type: Number, default: 0 },
  comments: { type: [String], default: [] },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', PostSchema);