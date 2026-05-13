import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('local API CORS allow-methods header includes PATCH', () => {
  const localApiPath = path.resolve(__dirname, '../../scripts/local-api.js');
  const source = fs.readFileSync(localApiPath, 'utf8');

  assert.match(
    source,
    /Access-Control-Allow-Methods',\s*'GET,POST,PATCH,DELETE,OPTIONS'/
  );
});
