import test from 'node:test';
import assert from 'node:assert/strict';

import { extractCategoryOverride } from '../../lib/category-override.js';

test('extractCategoryOverride parses typed slash prefixes', () => {
  assert.deepEqual(extractCategoryOverride('/reminder buy tomatoes at 8pm'), {
    category: 'reminder',
    text: 'buy tomatoes at 8pm',
  });

  assert.deepEqual(extractCategoryOverride('/todo: submit report'), {
    category: 'todo',
    text: 'submit report',
  });
});

test('extractCategoryOverride parses voice-transcribed slash prefixes', () => {
  assert.deepEqual(extractCategoryOverride('slash note meeting moved to 4pm'), {
    category: 'note',
    text: 'meeting moved to 4pm',
  });

  assert.deepEqual(extractCategoryOverride('slash thought this could be a product'), {
    category: 'thought',
    text: 'this could be a product',
  });
});

test('extractCategoryOverride leaves untouched text when there is no prefix', () => {
  assert.deepEqual(extractCategoryOverride('remind me tomorrow morning'), {
    category: null,
    text: 'remind me tomorrow morning',
  });
});
