/**
 * auth.ts — JWT Auth Middleware (monolithic, co-located with server)
 *
 * REST middleware:   attach to any Express route via `authenticate`
 * Socket middleware: attach to io.use() for handshake validation
 */

import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme_secret';

export interface JwtPayload {
  userId: string;
  email: string;
}

// ── Extend Express Request to carry decoded user ──────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * authenticate — Express middleware.
 * Reads Bearer token from Authorization header, verifies, attaches user.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Missing auth token' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * socketAuthenticate — Socket.io handshake middleware.
 * Token passed via socket.handshake.auth.token.
 */
export function socketAuthenticate(socket: Socket, next: (err?: Error) => void): void {
  const token: string | undefined = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Socket auth: missing token'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    socket.data.userId = payload.userId;
    socket.data.email  = payload.email;
    next();
  } catch {
    next(new Error('Socket auth: invalid token'));
  }
}

/**
 * signToken — generate a signed JWT (used in authRoutes).
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}