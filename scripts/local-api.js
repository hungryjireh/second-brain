#!/usr/bin/env node
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(__dirname, '..', 'api');
const rootDir = path.join(__dirname, '..');

// Match vercel dev behavior: prefer .env.local, then fall back to .env
dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else if (ent.isFile() && full.endsWith('.js')) out.push(full);
  }
  return out;
}

// Mount each file under /api as an Express route
for (const file of walk(apiDir)) {
  const rel = path.relative(apiDir, file).replace(/\\/g, '/');
  let route = '/api/' + rel.replace(/\.js$/, '');
  route = route.replace(/\/index$/, '') || '/api';

  const mod = await import(pathToFileURL(file).href);
  const handler = mod.default;
  if (typeof handler !== 'function') {
    console.warn(`[local-api] Skipping ${file} — default export not a function`);
    continue;
  }

  app.all(route, async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(`[local-api] Handler error for ${route}:`, err);
      res.status(500).json({ error: err?.message || 'internal error' });
    }
  });

  console.log(`[local-api] Mounted ${route} -> ${file}`);
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`[local-api] Listening on http://localhost:${port}`));
