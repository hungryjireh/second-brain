import test from "node:test";
import assert from "node:assert/strict";

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test("getGroqModel returns default model when GROQ_MODEL is not set", async () => {
  const original = {
    GROQ_MODEL: process.env.GROQ_MODEL,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  };
  delete process.env.GROQ_MODEL;
  process.env.GROQ_API_KEY = "test-key";

  try {
    const { getGroqModel } = await importFresh(
      "../../lib/classify.js",
      "default-model",
    );
    assert.equal(getGroqModel(), "llama-3.1-8b-instant");
  } finally {
    process.env.GROQ_MODEL = original.GROQ_MODEL;
    process.env.GROQ_API_KEY = original.GROQ_API_KEY;
  }
});

test("getGroqModel returns GROQ_MODEL from env when provided", async () => {
  const original = {
    GROQ_MODEL: process.env.GROQ_MODEL,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  };
  process.env.GROQ_MODEL = "llama-3.3-70b-versatile";
  process.env.GROQ_API_KEY = "test-key";

  try {
    const { getGroqModel } = await importFresh(
      "../../lib/classify.js",
      "override-model",
    );
    assert.equal(getGroqModel(), "llama-3.3-70b-versatile");
  } finally {
    process.env.GROQ_MODEL = original.GROQ_MODEL;
    process.env.GROQ_API_KEY = original.GROQ_API_KEY;
  }
});
