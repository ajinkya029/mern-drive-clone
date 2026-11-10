import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import protect from '../middleware/auth.js';
const router = Router();
const makeToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email || !password || password.length < 8) return res.status(400).json({ message: 'Name, email and a password of at least 8 characters are required' });
    if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists' });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: makeToken(user._id), user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) { res.status(500).json({ message: 'Could not create account' }); }
});
router.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) return res.status(401).json({ message: 'Email or password is incorrect' });
  res.json({ token: makeToken(user._id), user: { id: user._id, name: user.name, email: user.email } });
});
router.get('/me', protect, (req, res) => res.json({ user: req.user }));
export default router;
