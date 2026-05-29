import { apiRequest } from "../../api";
import { createAudioPlayer } from "expo-audio";
import {
  playBrainstormTalkAudio,
  requestBrainstormTalkStreamTurn,
  transcribeBrainstormTalkAudio,
} from "../unrealSpeechService";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
  buildApiUrl: jest.fn((path) => `http://localhost:3000/api${path}`),
  createAuthHeaders: jest.fn((token) =>
    token ? { Authorization: `Bearer ${token}` } : undefined,
  ),
}));

describe("unrealSpeechService streaming turn", () => {
  const originalStreamingFlagEnv =
    process.env.EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1 =
      originalStreamingFlagEnv;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1 =
      originalStreamingFlagEnv;
    global.fetch = originalFetch;
  });

  it("submits stream-turn payload and normalizes response", async () => {
    apiRequest.mockResolvedValueOnce({
      draftReply: " draft reply ",
      deferred: false,
      wordCount: 12,
      minimumWordsForDraft: 8,
      committed: false,
    });

    const result = await requestBrainstormTalkStreamTurn({
      token: "token",
      partialText: "hello this is a partial transcript",
      history: [{ role: "user", content: "hi" }],
      commitTurn: false,
      minimumWordsForDraft: 8,
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/brainstorm?action=stream-turn",
      expect.objectContaining({
        method: "POST",
        token: "token",
        body: {
          partial_text: "hello this is a partial transcript",
          history: [{ role: "user", content: "hi" }],
          commit_turn: false,
          minimum_words_for_draft: 8,
        },
      }),
    );
    expect(result).toEqual({
      draftReply: "draft reply",
      deferred: false,
      wordCount: 12,
      minimumWordsForDraft: 8,
      committed: false,
    });
  });

  it("throws when partial transcript is missing", async () => {
    await expect(
      requestBrainstormTalkStreamTurn({
        token: "token",
        partialText: "   ",
      }),
    ).rejects.toThrow("Missing partial transcript text.");
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("normalizes upstream errors into user-safe message", async () => {
    apiRequest.mockRejectedValueOnce(new Error("boom"));

    await expect(
      requestBrainstormTalkStreamTurn({
        token: "token",
        partialText: "hello there",
      }),
    ).rejects.toThrow("boom");
  });

  it("enables streaming when EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1=1", () => {
    process.env.EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1 = "1";

    jest.isolateModules(() => {
      const {
        BRAINSTORM_TALK_STREAMING_ENABLED: streamingEnabled,
      } = require("../unrealSpeechService");
      expect(streamingEnabled).toBe(true);
    });
  });

  it("disables streaming when EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1 is not 1", () => {
    process.env.EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1 = "0";

    jest.isolateModules(() => {
      const {
        BRAINSTORM_TALK_STREAMING_ENABLED: streamingEnabled,
      } = require("../unrealSpeechService");
      expect(streamingEnabled).toBe(false);
    });
  });

  it("submits transcribe payload as raw audio body", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ transcript: "hello world" }),
    });

    const result = await transcribeBrainstormTalkAudio({
      token: "token",
      audioUri: "file:///tmp/test-recording.m4a",
      extension: "m4a",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/brainstorm?action=transcribe-raw"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "Content-Type": "application/octet-stream",
        }),
        body: expect.any(ArrayBuffer),
      }),
    );
    expect(result).toBe("hello world");
  });

  it("throws when transcription audio uri is missing", async () => {
    await expect(
      transcribeBrainstormTalkAudio({
        token: "token",
        audioUri: "   ",
      }),
    ).rejects.toThrow("Missing audio payload for transcription.");
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("throws backend error message when raw transcribe request fails", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: "upstream failed" }),
    });

    await expect(
      transcribeBrainstormTalkAudio({
        token: "token",
        audioUri: "file:///tmp/test-recording.m4a",
      }),
    ).rejects.toThrow("upstream failed");
  });

  it("throws when raw transcribe response has empty transcript", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ transcript: "   " }),
    });

    await expect(
      transcribeBrainstormTalkAudio({
        token: "token",
        audioUri: "file:///tmp/test-recording.m4a",
      }),
    ).rejects.toThrow("Transcription returned empty text.");
  });

  it("creates playback player without keeping audio session pinned", async () => {
    await playBrainstormTalkAudio({
      audioBase64: "ZmFrZQ==",
      mimeType: "audio/mpeg",
    });

    expect(createAudioPlayer).toHaveBeenCalledWith(expect.any(String));
    expect(createAudioPlayer).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ keepAudioSessionActive: true }),
    );
  });
});
