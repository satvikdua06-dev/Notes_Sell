import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { requireAuth } from '../middleware/requireAuth';
import { JwtPayload } from '../types';

const router = Router();

const isProd = process.env.NODE_ENV === 'production';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  // SameSite=None is required for cross-origin requests (Vercel frontend → Render backend).
  // SameSite=None mandates Secure=true, which is set above in production.
  // In local dev (http) we use 'lax' because browsers reject None without Secure.
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

router.post('/signup', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password and name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    const result = await db.query<{ id: string; email: string; name: string; role: string }>(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, role`,
      [email.toLowerCase().trim(), hash, name.trim()]
    );
    const user = result.rows[0];
    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role as 'user' | 'admin' };
    const token = jwt.sign(payload, process.env.JWT_SECRET || '', { expiresIn: '7d' });
    res.cookie('session_token', token, COOKIE_OPTS);
    return res.status(201).json({ 
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const result = await db.query<{ id: string; email: string; name: string; role: string; password_hash: string }>(
      'SELECT id, email, name, role, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role as 'user' | 'admin' };
    const token = jwt.sign(payload, process.env.JWT_SECRET || '', { expiresIn: '7d' });
    res.cookie('session_token', token, COOKIE_OPTS);
    return res.json({ 
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('session_token', { ...COOKIE_OPTS, maxAge: undefined });
  return res.json({ ok: true });
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.query<{ id: string; email: string; name: string; role: string }>(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
