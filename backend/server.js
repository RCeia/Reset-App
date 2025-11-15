// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

// serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mongo
mongoose.connect('mongodb://localhost:27017/myappdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true, default: 'User' },
  avatar: { type: String, default: '' },
});
const User = mongoose.model('User', UserSchema);

// Post schema
const PostSchema = new mongoose.Schema({
  imagePath: { type: String, required: true }, // saved file path on server
  likes: { type: Number, default: 0 },
  comments: { type: [String], default: [] },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
});
const Post = mongoose.model('Post', PostSchema);

// auth middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, 'secret_key', (err, decoded) => {
    if (err) return res.status(401).json({ success: false });
    req.userId = decoded.id;
    next();
  });
};

// multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.userId || 'anon'}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ---------- AUTH endpoints (register/login/me/upload-avatar) ----------
app.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed, username });
    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false });

    const token = jwt.sign({ id: user._id }, 'secret_key');
    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false });

    res.json({
      username: user.username,
      avatar: user.avatar ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(user.avatar)}` : '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post('/upload-avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false });

    user.avatar = req.file.path;
    await user.save();

    res.json({ success: true, avatar: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ---------- POSTS endpoints ----------
app.get('/posts', async (req, res) => {
  try {
    // return latest first
    const posts = await Post.find().sort({ createdAt: -1 }).limit(100).lean();
    // convert imagePath to public URL
    const mapped = posts.map(p => ({
      id: p._id,
      imageUrl: `${req.protocol}://${req.get('host')}/uploads/${path.basename(p.imagePath)}`,
      likes: p.likes,
      comments: p.comments,
      createdAt: p.createdAt,
    }));
    res.json({ success: true, posts: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// create a post (image upload). requires auth
app.post('/posts', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Image required' });
    const post = new Post({
      imagePath: req.file.path,
      author: req.userId,
    });
    await post.save();

    const payload = {
      id: post._id,
      imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
      likes: post.likes,
      comments: post.comments,
      createdAt: post.createdAt,
    };

    // broadcast to all connected clients
    io.emit('new_post', payload);

    res.json({ success: true, post: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// like a post
app.post('/posts/:id/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false });
    post.likes = (post.likes || 0) + 1;
    await post.save();

    const updated = { id: post._id, likes: post.likes };
    io.emit('post_liked', updated); // real-time update
    res.json({ success: true, likes: post.likes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// add comment
app.post('/posts/:id/comment', authenticate, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ success: false });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false });
    post.comments.push(comment);
    await post.save();

    io.emit('post_commented', { id: post._id, comment });
    res.json({ success: true, comments: post.comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// Socket.IO connection logging
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

// start server
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});
