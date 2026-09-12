import jwt from 'jsonwebtoken'; import crypto from 'crypto'; import {AuthUser} from '../types';
const accessSecret=process.env.JWT_ACCESS_SECRET!; const refreshSecret=process.env.JWT_REFRESH_SECRET!;
export function signAccess(user:AuthUser){return jwt.sign(user,accessSecret,{expiresIn:'15m'});}
export function signRefresh(user:AuthUser){return jwt.sign({sub:user.id},refreshSecret,{expiresIn:'7d'});}
export function verifyAccess(token:string){return jwt.verify(token,accessSecret) as AuthUser;}
export function verifyRefresh(token:string){return jwt.verify(token,refreshSecret) as {sub:string};}
export function hashToken(token:string){return crypto.createHash('sha256').update(token).digest('hex');}
