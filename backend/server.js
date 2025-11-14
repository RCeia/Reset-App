import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/myappdb');

// User schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);

// Register
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashed });
  await user.save();
  res.json({ success: true, userId: user._id });
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ success: false });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ success: false });

  const token = jwt.sign({ id: user._id }, 'secret_key'); // Use .env for production
  res.json({ success: true, token });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Backend running on http://0.0.0.0:3000');
});

