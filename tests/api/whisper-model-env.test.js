import test from "node:test";
import assert from "node:assert/strict";

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test("getGroqWhisperModel returns default model when GROQ_WHISPER_MODEL is not set", async () => {
  const original = {
    GROQ_WHISPER_MODEL: process.env.GROQ_WHISPER_MODEL,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  };
  delete process.env.GROQ_WHISPER_MODEL;
  process.env.GROQ_API_KEY = "test-key";

  try {
    const { getGroqWhisperModel } = await importFresh(
      "../../lib/whisper.js",
      "default-whisper-model",
    );
    assert.equal(getGroqWhisperModel(), "whisper-large-v3");
  } finally {
    process.env.GROQ_WHISPER_MODEL = original.GROQ_WHISPER_MODEL;
    process.env.GROQ_API_KEY = original.GROQ_API_KEY;
  }
});

test("getGroqWhisperModel returns GROQ_WHISPER_MODEL from env when provided", async () => {
  const original = {
    GROQ_WHISPER_MODEL: process.env.GROQ_WHISPER_MODEL,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  };
  process.env.GROQ_WHISPER_MODEL = "whisper-large-v3";
  process.env.GROQ_API_KEY = "test-key";

  try {
    const { getGroqWhisperModel } = await importFresh(
      "../../lib/whisper.js",
      "override-whisper-model",
    );
    assert.equal(getGroqWhisperModel(), "whisper-large-v3");
  } finally {
    process.env.GROQ_WHISPER_MODEL = original.GROQ_WHISPER_MODEL;
    process.env.GROQ_API_KEY = original.GROQ_API_KEY;
  }
});
