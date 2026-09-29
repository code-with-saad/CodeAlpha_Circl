import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
// Names that would collide with routes or impersonate staff.
const RESERVED = new Set(['admin', 'me', 'search', 'suggested', 'settings', 'explore', 'saved', 'compose', 'login', 'register', 'notifications', 'tag', 'post', 'api', 'support', 'circl']);
// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('circl-dummy-password', 12);

// Inputs must be plain strings; this blocks NoSQL operator injection like {"$gt": ""}.
const str = (v) => (typeof v === 'string' ? v.trim() : '');

const session = (user) => ({ token: signToken(user._id), user: user.toPublic() });

export async function register(req, res) {
  const username = str(req.body.username).toLowerCase();
  const email = str(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const displayName = str(req.body.displayName).slice(0, 40);

  const errors = {};
  if (!USERNAME_RE.test(username)) errors.username = '3 to 20 characters: letters, numbers, underscore';
  else if (RESERVED.has(username)) errors.username = 'That username is reserved';
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'Enter a valid email';
  if (password.length < 8 || password.length > 72) errors.password = 'Use 8 to 72 characters';
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields', errors });

  const taken = await User.findOne({ $or: [{ username }, { email }] }).select('username email');
  if (taken) {
    const field = taken.username === username ? 'username' : 'email';
    return res.status(409).json({ message: `That ${field} is already in use`, errors: { [field]: `That ${field} is already in use` } });
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await User.create({ username, email, password: hash, displayName });
  res.status(201).json(session(user));
}

export async function login(req, res) {
  const email = str(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const user = await User.findOne({ email }).select('+password');
  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ message: 'Incorrect email or password' });
  if (user.banned) return res.status(403).json({ message: 'This account has been suspended' });

  res.json(session(user));
}

export function me(req, res) {
  res.json({ user: req.user.toPublic() });
}
