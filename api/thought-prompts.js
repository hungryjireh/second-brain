import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsPath = path.join(__dirname, '..', 'lib', 'static', 'thought-prompts.json');

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  try {
    const content = await fs.readFile(promptsPath, 'utf8');
    const prompts = JSON.parse(content);
    return json(res, 200, prompts);
  } catch (err) {
    console.error('[GET /api/thought-prompts]', err);
    return json(res, 500, { error: 'failed to load thought prompts' });
  }
}
