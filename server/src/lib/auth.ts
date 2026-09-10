import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
import { HttpError } from './http.js';

/*
 * Single-user auth for a personal app.
 *
 * The session is a stateless HMAC-signed token in an httpOnly cookie: nothing
 * to store server-side, survives restarts and multiple instances, and the
 * browser's JavaScript can never read it (so an XSS bug cannot steal it).
 */

export const SESSION_COOKIE = 'cashflow_session';
const SESSION_DAYS = 7;
export const SESSION_MAX_AGE_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

const isProduction = () => process.env.NODE_ENV === 'production';

/** Generated per-process in development so local dev needs no configuration. */
const devSecret = crypto.randomBytes(32).toString('hex');

const config = () => ({
  username: process.env.AUTH_USERNAME ?? 'admin',
  password: process.env.AUTH_PASSWORD ?? '',
  secret: process.env.SESSION_SECRET ?? devSecret,
});

/**
 * Both arguments are attacker-influenced, so compare in constant time. Hashing
 * first keeps the comparison a fixed length — timingSafeEqual throws on a
 * length mismatch, which would itself leak the password length.
 */
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const sign = (data: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(data).digest('base64url');

export function createSessionToken(username: string): string {
  const { secret } = config();
  const payload = `${Buffer.from(username).toString('base64url')}.${Date.now() + SESSION_MAX_AGE_MS}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedUser, expiry, signature] = parts as [string, string, string];

  const { secret, username } = config();
  if (!safeEqual(sign(`${encodedUser}.${expiry}`, secret), signature)) return null;
  if (Number(expiry) < Date.now()) return null;

  // A changed AUTH_USERNAME must invalidate tokens issued for the old one.
  const user = Buffer.from(encodedUser, 'base64url').toString('utf8');
  return user === username ? user : null;
}

export function verifyCredentials(username: string, password: string): boolean {
  const expected = config();
  if (!expected.password) return false; // unconfigured: refuse everything
  return safeEqual(username, expected.username) && safeEqual(password, expected.password);
}

export const cookieOptions = () =>
  ({
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(), // Render terminates TLS, so the cookie can be secure there
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  }) as const;

/** Rejects anything without a valid session cookie. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const user = readSessionToken(req.cookies?.[SESSION_COOKIE]);
  if (!user) {
    next(new HttpError(401, 'Not signed in'));
    return;
  }
  next();
};

/** True when a username and password are configured to check against. */
export const isAuthConfigured = () => config().password.length > 0;
