import './lib/env.js';
import { createApp } from './app.js';
import { connectDb, disconnectDb } from './db.js';

// Hosts inject PORT; binding to 0.0.0.0 is what makes the container reachable.
const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/cost-analysis';
if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
  // Falling back to localhost in production means a container that starts and
  // then fails every request. Fail loudly at boot instead.
  console.error('[api] MONGODB_URI is required in production');
  process.exit(1);
}

async function main() {
  await connectDb(MONGODB_URI);
  const server = createApp(CORS_ORIGIN).listen(PORT, HOST, () => {
    console.log(`[api] listening on ${HOST}:${PORT}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      console.log(`\n[api] ${signal} received, shutting down`);
      server.close(async () => {
        await disconnectDb();
        process.exit(0);
      });
    });
  }
}

main().catch((err) => {
  console.error('[api] failed to start:', err);
  process.exit(1);
});
