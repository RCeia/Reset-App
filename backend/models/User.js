const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true, default: 'User' },
  avatar: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false }, 
  tags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag'
    }]
});

module.exports = mongoose.model('User', UserSchema);