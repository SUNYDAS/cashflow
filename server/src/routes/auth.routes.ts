import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/http.js';
import {
  SESSION_COOKIE,
  cookieOptions,
  createSessionToken,
  readSessionToken,
  verifyCredentials,
} from '../lib/auth.js';

export const authRouter = Router();

const loginBody = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

authRouter.post('/login', async (req, res) => {
  const { username, password } = loginBody.parse(req.body);

  if (!verifyCredentials(username, password)) {
    // A small random delay blunts trivial online guessing, and the message
    // never says which of the two was wrong.
    await new Promise((resolve) => setTimeout(resolve, 200 + crypto.randomInt(200)));
    throw new HttpError(401, 'Incorrect username or password');
  }

  res.cookie(SESSION_COOKIE, createSessionToken(username), cookieOptions());
  res.json({ data: { username } });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.status(204).end();
});

/** The frontend calls this on load to decide between the app and the login page. */
authRouter.get('/me', (req, res) => {
  const username = readSessionToken(req.cookies?.[SESSION_COOKIE]);
  if (!username) throw new HttpError(401, 'Not signed in');
  res.json({ data: { username } });
});
