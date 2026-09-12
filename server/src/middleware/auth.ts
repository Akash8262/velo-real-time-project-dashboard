import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccess } from '../utils/auth';
import type { AuthUser } from '../types';

export function auth(req: Request & { user?: AuthUser }, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    req.user = verifyAccess(header.slice(7).trim());
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' } });
  }
}

export function roles(...allowed: Role[]) {
  return (req: Request & { user?: AuthUser }, res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    next();
  };
}
