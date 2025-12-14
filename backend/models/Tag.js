// backend/models/Tag.js
const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true 
    },
    // Chats permitidos por esta tag
    allowedChats: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Chat' 
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
});

module.exports = mongoose.model('Tag', tagSchema);