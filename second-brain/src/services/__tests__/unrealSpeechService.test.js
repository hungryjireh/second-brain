import { apiRequest } from "../../api";
import {
  requestBrainstormTalkStreamTurn,
  transcribeBrainstormTalkAudio,
} from "../unrealSpeechService";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
}));

describe("unrealSpeechService streaming turn", () => {
  const originalStreamingFlagEnv =
    process.env.EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1 =
      originalStreamingFlagEnv;
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1 =
      originalStreamingFlagEnv;
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

  it("submits transcribe payload with audio_uri", async () => {
    apiRequest.mockResolvedValueOnce({ transcript: "hello world" });

    const result = await transcribeBrainstormTalkAudio({
      token: "token",
      audioUri: "file:///tmp/test-recording.m4a",
      extension: "m4a",
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/brainstorm?action=transcribe",
      expect.objectContaining({
        method: "POST",
        token: "token",
        body: expect.objectContaining({
          audio_uri: "file:///tmp/test-recording.m4a",
          extension: "m4a",
        }),
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
});
