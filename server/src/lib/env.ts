import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/**
 * Loads server/.env regardless of the working directory.
 *
 * `import 'dotenv/config'` resolves .env against process.cwd(), so starting the
 * server from the project root (which `npm start` does) silently found nothing.
 * Resolving from this module's own location works either way.
 *
 * Import this before anything that reads process.env.
 */
dotenv.config({
  path: path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../.env'),
  quiet: true,
});
