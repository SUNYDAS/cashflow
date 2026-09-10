import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { HttpError } from './lib/http.js';
import { transactionsRouter } from './routes/transactions.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { requireAuth } from './lib/auth.js';

/** Built frontend, two levels up from server/dist. Absent during local dev. */
const CLIENT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../dist');

const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.originalUrl}` } });
};

/** Every thrown error funnels through here so responses share one shape. */
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { message: 'Invalid request', details: err.issues },
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: { message: err.message } });
    return;
  }

  // Middleware such as body-parser throws errors that already carry a status —
  // a malformed JSON body is the client's fault (400), not a server fault.
  const status = (err as { status?: number; statusCode?: number })?.status ??
    (err as { statusCode?: number })?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: { message: 'Invalid request' } });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({ error: { message: 'Internal server error' } });
};

export function createApp(corsOrigin: string) {
  const app = express();

  // credentials:true so the session cookie survives a split-origin deployment;
  // in the single-service setup every request is same-origin anyway.
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'up' : 'down' });
  });

  app.use('/api/auth', authRouter);

  // Everything below the auth routes needs a session.
  app.use('/api/transactions', requireAuth, transactionsRouter);
  app.use('/api/analytics', requireAuth, analyticsRouter);

  // In production one service serves both, so the browser's /api calls are
  // same-origin and no proxy or CORS allowance is involved. In dev this
  // directory does not exist and Vite serves the frontend instead.
  if (fs.existsSync(CLIENT_DIR)) {
    app.use(express.static(CLIENT_DIR));

    // A client-side route like /reports is not a file, so hand back index.html
    // and let React route it. API paths must still 404 as JSON.
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(CLIENT_DIR, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
