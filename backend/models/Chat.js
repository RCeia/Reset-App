const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const MessageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = {
    Chat: mongoose.model('Chat', ChatSchema),
    Message: mongoose.model('Message', MessageSchema)
};