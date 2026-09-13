import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { hashToken, signAccess, signRefresh, verifyRefresh } from '../utils/auth';
import { auth } from '../middleware/auth';

const r = Router();
const isProduction = process.env.NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
const publicUser = (u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

r.post('/login', async (req, res, next) => {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u || !(await bcrypt.compare(password, u.passwordHash))) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    const user = publicUser(u), accessToken = signAccess(user), refreshToken = signRefresh(user);
    await prisma.refreshToken.create({ data: { tokenHash: hashToken(refreshToken), userId: u.id, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    return res.cookie('refreshToken', refreshToken, cookieOpts).json({ accessToken, user });
  } catch (e) { next(e); }
});

r.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: { code: 'NO_REFRESH', message: 'Refresh token missing' } });
    const payload = verifyRefresh(token);
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!row || row.userId !== payload.sub) {
      res.clearCookie('refreshToken', cookieOpts);
      return res.status(401).json({ error: { code: 'INVALID_REFRESH', message: 'Invalid refresh token' } });
    }
    if (row.expiresAt <= new Date()) {
      await prisma.refreshToken.deleteMany({ where: { id: row.id } });
      res.clearCookie('refreshToken', cookieOpts);
      return res.status(401).json({ error: { code: 'EXPIRED_REFRESH', message: 'Refresh token expired' } });
    }
    const user = publicUser(row.user), accessToken = signAccess(user), newRefreshToken = signRefresh(user);
    const deleted = await prisma.refreshToken.deleteMany({ where: { id: row.id } });
    if (deleted.count === 0) return res.status(401).json({ error: { code: 'REFRESH_REPLAY', message: 'Refresh token has already been used' } });
    await prisma.refreshToken.create({ data: { tokenHash: hashToken(newRefreshToken), userId: row.userId, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    return res.cookie('refreshToken', newRefreshToken, cookieOpts).json({ accessToken, user });
  } catch (e) { next(e); }
});

r.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(token) } });
    res.clearCookie('refreshToken', cookieOpts);
    return res.json({ ok: true });
  } catch (e) { next(e); }
});

r.get('/me', auth, (req: any, res) => res.json({ user: req.user }));
export default r;
