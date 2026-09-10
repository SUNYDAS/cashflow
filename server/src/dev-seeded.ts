/** In-memory MongoDB + demo data + API, for running the app with no database. */
import './lib/env.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from './app.js';
import { connectDb } from './db.js';
import { seedDemoData } from './seed-data.js';

const PORT = Number(process.env.PORT ?? 4000);

const mongod = await MongoMemoryServer.create();
await connectDb(mongod.getUri('cost-analysis'));
const summary = await seedDemoData();
console.log(`[db] in-memory MongoDB seeded with ${summary.count} demo transactions`);

createApp(process.env.CORS_ORIGIN ?? 'http://localhost:5173').listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
