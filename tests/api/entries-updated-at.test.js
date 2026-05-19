import test from "node:test";
import assert from "node:assert/strict";

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test("normalizeEntry returns updated_at when present", async () => {
  const { normalizeEntry } = await importFresh(
    "../../api/entries.js",
    "normalize-entry-updated-at-present",
  );

  const normalized = normalizeEntry({
    id: 1,
    category: "note",
    raw_text: "alpha",
    summary: "alpha",
    created_at: 100,
    updated_at: 200,
    tags: [],
  });

  assert.equal(normalized.updated_at, 200);
});

test("normalizeEntry falls back updated_at to created_at when missing", async () => {
  const { normalizeEntry } = await importFresh(
    "../../api/entries.js",
    "normalize-entry-updated-at-fallback",
  );

  const normalized = normalizeEntry({
    id: 2,
    category: "note",
    raw_text: "beta",
    summary: "beta",
    created_at: 300,
    tags: [],
  });

  assert.equal(normalized.updated_at, 300);
});
