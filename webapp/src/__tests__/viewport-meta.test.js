import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('index.html viewport meta', () => {
  it('includes iOS-safe scaling proportions', () => {
    const indexHtmlPath = resolve(process.cwd(), 'index.html');
    const html = readFileSync(indexHtmlPath, 'utf8');

    expect(html).toContain('name="viewport"');
    expect(html).toContain('width=device-width');
    expect(html).toContain('initial-scale=1');
    expect(html).toContain('minimum-scale=1');
    expect(html).toContain('viewport-fit=cover');
  });
});
