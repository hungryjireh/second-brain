import test from 'node:test';
import assert from 'node:assert/strict';

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test('LLM tags are validated against permitted user tags excluding globally permissive tags', async () => {
  const { filterClassifierTagsByPermittedUserTags } = await importFresh('../../api/entries.js', 'classifier-tag-filter');

  const classifiedTags = [
    { name: 'Work', normalized_name: 'work' },
    { name: 'Random', normalized_name: 'random' },
    { name: 'OpenBrain', normalized_name: 'openbrain' },
    { name: 'SecondBrain', normalized_name: 'secondbrain' },
  ];
  const existingTags = ['work', 'focus', 'openbrain', 'secondbrain'];

  const filtered = filterClassifierTagsByPermittedUserTags(classifiedTags, existingTags);

  assert.deepEqual(
    filtered.map(tag => tag.normalized_name),
    ['work', 'openbrain', 'secondbrain']
  );
});

