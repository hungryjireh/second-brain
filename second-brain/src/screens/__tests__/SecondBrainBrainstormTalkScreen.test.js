import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Animated } from "react-native";
import {
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import SecondBrainBrainstormTalkScreen from "../SecondBrainBrainstormTalkScreen";
import { apiRequest } from "../../api";
import {
  synthesizeBrainstormTalkAudio,
  transcribeBrainstormTalkAudio,
} from "../../services/unrealSpeechService";
import { writeBrainstormSession } from "../../utils/brainstormSessions";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("../../services/unrealSpeechService", () => ({
  playBrainstormTalkAudio: jest.fn(async () => {}),
  stopBrainstormTalkPlayback: jest.fn(async () => {}),
  synthesizeBrainstormTalkAudio: jest.fn(async () => ({
    audioBase64: "ZmFrZQ==",
    mimeType: "audio/mpeg",
  })),
  transcribeBrainstormTalkAudio: jest.fn(async () => "hello"),
}));

jest.mock("../../utils/brainstormSessions", () => {
  const sessionsById = new Map();
  function clone(value) {
    return value ? JSON.parse(JSON.stringify(value)) : value;
  }
  return {
    BRAINSTORM_SESSION_MODES: { TEXT: "text", TALK: "talk" },
    createBrainstormSession: jest.fn(async () => {
      const session = {
        id: "talk-session-1",
        mode: "talk",
        entryId: null,
        lifecycle: "active",
        finalizeGuards: { ended: false, wipSaved: false },
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      sessionsById.set(session.id, clone(session));
      return clone(session);
    }),
    getLinkedBrainstormSessionId: jest.fn(async () => ""),
    isBrainstormTalkEntry: jest.fn(() => false),
    linkEntryToBrainstormSession: jest.fn(async () => {}),
    normalizeBrainstormMode: jest.fn((value) =>
      value === "talk" ? "talk" : "text",
    ),
    normalizeBrainstormSession: jest.fn((session) =>
      session ? { ...session, mode: session.mode || "talk" } : null,
    ),
    readBrainstormSession: jest.fn(async (sessionId) =>
      clone(sessionsById.get(sessionId) || null),
    ),
    toBrainstormTranscript: jest.fn((messages) =>
      (Array.isArray(messages) ? messages : [])
        .map(
          (message) =>
            `${message?.role === "assistant" ? "Assistant" : "User"}: ${String(message?.content || "").trim()}`,
        )
        .join("\n\n"),
    ),
    writeBrainstormSession: jest.fn(async (session) => {
      sessionsById.set(session.id, clone(session));
    }),
  };
});

describe("SecondBrainBrainstormTalkScreen", () => {
  let isRecording = false;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    isRecording = false;
    useAudioRecorderState.mockImplementation(() => ({ isRecording }));
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        return { reply: "assistant reply" };
      }
      if (path === "/entries" && options?.method === "POST") {
        return { id: 800, title: "Conversation" };
      }
      if (path === "/entries?id=800" && options?.method === "PATCH") {
        return { id: 800, title: "Conversation" };
      }
      return {};
    });
  });

  it("shows talk intro copy and listen control by default", async () => {
    isRecording = false;

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(view.getByText("Brainstorm talk")).toBeTruthy();
    expect(view.getByText("Talk through your ideas")).toBeTruthy();
    expect(
      view.getByText(
        "Speak naturally. We will transcribe your thoughts and brainstorm with you in real time.",
      ),
    ).toBeTruthy();
    expect(view.getByLabelText("Listen")).toBeTruthy();
    expect(view.queryByLabelText("End brainstorm talk")).toBeNull();
    expect(view.queryByText("Idle")).toBeNull();
    expect(view.queryByText("Listening")).toBeNull();
    expect(view.queryByText("Paused")).toBeNull();
  });

  it("shows pause and transcribe control while recording", async () => {
    isRecording = true;

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(view.getByLabelText("Pause & transcribe")).toBeTruthy();
    expect(
      view.getByText("Press Pause & transcribe when you finish speaking."),
    ).toBeTruthy();
    expect(
      view.getAllByText("Press Pause & transcribe when you finish speaking."),
    ).toHaveLength(1);
  });

  it("shows processing guidance while transcribing", async () => {
    isRecording = true;
    let resolveTranscript;
    const transcriptPromise = new Promise((resolve) => {
      resolveTranscript = resolve;
    });
    transcribeBrainstormTalkAudio.mockReturnValueOnce(transcriptPromise);

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    isRecording = false;
    view.rerender(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(
        view.getByText("Processing your voice and preparing a response..."),
      ).toBeTruthy();
    });

    await act(async () => {
      resolveTranscript("hello");
      await transcriptPromise;
    });
  });

  it("transcribes when mic is re-pressed while recording", async () => {
    isRecording = true;

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    await waitFor(() => {
      expect(transcribeBrainstormTalkAudio).toHaveBeenCalled();
    });
  });

  it("shows an error and asks the user to speak again when transcript is empty", async () => {
    isRecording = true;
    transcribeBrainstormTalkAudio.mockResolvedValueOnce("   ");

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    await waitFor(() => {
      expect(
        view.getByText(
          "I couldn't hear any words. Please speak again and then press Pause & transcribe.",
        ),
      ).toBeTruthy();
    });
    expect(apiRequest).not.toHaveBeenCalledWith(
      "/brainstorm",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("transcribes and returns to listen state without navigating away", async () => {
    isRecording = true;
    const goBack = jest.fn();
    const navigate = jest.fn();

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack, navigate }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    await waitFor(() => {
      expect(transcribeBrainstormTalkAudio).toHaveBeenCalled();
    });

    isRecording = false;
    view.rerender(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack, navigate }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(view.getByLabelText("Listen")).toBeTruthy();
    });

    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("allows starting a new recording after an immediate auto-submitted turn", async () => {
    isRecording = true;
    transcribeBrainstormTalkAudio.mockResolvedValueOnce("hello");

    const recorder = useAudioRecorder();
    const goBack = jest.fn();
    const navigate = jest.fn();
    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack, navigate }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    await waitFor(() => {
      expect(transcribeBrainstormTalkAudio).toHaveBeenCalledTimes(1);
    });

    isRecording = false;
    view.rerender(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack, navigate }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(view.getByLabelText("Listen")).toBeTruthy();
    });

    fireEvent.press(view.getByLabelText("Listen"));

    await waitFor(() => {
      expect(recorder.record).toHaveBeenCalled();
    });
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(apiRequest).toHaveBeenCalledWith(
      "/brainstorm",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ message: "hello" }),
      }),
    );
  });

  it("submits paused transcript to LLM even if recorder state is still recording", async () => {
    isRecording = true;
    transcribeBrainstormTalkAudio.mockResolvedValueOnce("hello");

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    await waitFor(() => {
      expect(transcribeBrainstormTalkAudio).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/brainstorm",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ message: "hello" }),
        }),
      );
    });
  });

  it("auto-submits immediately after transcription without waiting for timers", async () => {
    jest.useFakeTimers();
    isRecording = true;
    transcribeBrainstormTalkAudio.mockResolvedValueOnce("hello");

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    await waitFor(() => {
      expect(transcribeBrainstormTalkAudio).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/brainstorm",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ message: "hello" }),
        }),
      );
    });
  });

  it("starts TTS synthesis before persisting the assistant turn", async () => {
    isRecording = true;
    transcribeBrainstormTalkAudio.mockResolvedValueOnce("hello");

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    await waitFor(() => {
      expect(transcribeBrainstormTalkAudio).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(synthesizeBrainstormTalkAudio).toHaveBeenCalledTimes(1);
    });

    const synthesisOrder =
      synthesizeBrainstormTalkAudio.mock.invocationCallOrder[0];
    const assistantWriteCall = writeBrainstormSession.mock.calls.find(
      ([sessionArg]) =>
        Array.isArray(sessionArg?.messages) &&
        sessionArg.messages.some(
          (message) =>
            message?.role === "assistant" &&
            message?.content === "assistant reply",
        ),
    );
    const assistantWriteOrder =
      assistantWriteCall &&
      writeBrainstormSession.mock.invocationCallOrder[
        writeBrainstormSession.mock.calls.indexOf(assistantWriteCall)
      ];

    expect(assistantWriteOrder).toBeDefined();
    expect(synthesisOrder).toBeLessThan(assistantWriteOrder);
  });

  it("re-enables recording mode again before resuming from paused state", async () => {
    isRecording = false;
    transcribeBrainstormTalkAudio.mockResolvedValueOnce("hello");
    const recorder = useAudioRecorder();

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Listen"));

    await waitFor(() => {
      expect(recorder.record).toHaveBeenCalledTimes(1);
    });

    isRecording = true;
    view.rerender(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    await waitFor(() => {
      expect(transcribeBrainstormTalkAudio).toHaveBeenCalledTimes(1);
    });

    isRecording = false;
    view.rerender(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(view.getByLabelText("Listen")).toBeTruthy();
    });

    fireEvent.press(view.getByLabelText("Listen"));

    await waitFor(() => {
      expect(recorder.record).toHaveBeenCalledTimes(2);
    });
    expect(setAudioModeAsync).toHaveBeenNthCalledWith(1, {
      allowsRecording: true,
      playsInSilentMode: true,
    });
    expect(setAudioModeAsync).toHaveBeenNthCalledWith(2, {
      allowsRecording: true,
      playsInSilentMode: true,
    });
  });

  it("animates mic controls with a slow slide down after first transcript hides intro", async () => {
    isRecording = true;
    transcribeBrainstormTalkAudio.mockResolvedValueOnce("hello");
    const timingSpy = jest.spyOn(Animated, "timing");

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    await waitFor(() => {
      expect(transcribeBrainstormTalkAudio).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(timingSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 32,
          duration: 520,
          useNativeDriver: true,
        }),
      );
    });
  });

  it("finalizes and navigates back when end button is pressed", async () => {
    isRecording = true;
    transcribeBrainstormTalkAudio.mockResolvedValueOnce("hello");
    const goBack = jest.fn();

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    await waitFor(() => {
      expect(transcribeBrainstormTalkAudio).toHaveBeenCalledTimes(1);
    });

    isRecording = false;
    view.rerender(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(view.getByLabelText("End brainstorm talk")).toBeTruthy();
    });

    fireEvent.press(view.getByLabelText("End brainstorm talk"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/brainstorm",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            message: expect.stringContaining("Return ONLY valid JSON"),
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(goBack).toHaveBeenCalled();
    });
  });

  it("shows Ending state while finalizing after pressing end", async () => {
    isRecording = true;
    transcribeBrainstormTalkAudio.mockResolvedValueOnce("hello");
    let resolveFinalize;
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        if (
          String(options?.body?.message || "").includes(
            "Return ONLY valid JSON",
          )
        ) {
          await new Promise((resolve) => {
            resolveFinalize = resolve;
          });
          return {
            reply:
              '{"description":"# Conversation Summary\\nDone.","title":"Ended talk","summary":"Done.","content":"Done."}',
          };
        }
        return { reply: "assistant reply" };
      }
      if (path === "/entries" && options?.method === "POST") {
        return { id: 800, title: "Conversation" };
      }
      if (path === "/entries?id=800" && options?.method === "PATCH") {
        return { id: 800, title: "Conversation" };
      }
      return {};
    });

    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("Pause & transcribe"));

    await waitFor(() => {
      expect(transcribeBrainstormTalkAudio).toHaveBeenCalledTimes(1);
    });

    isRecording = false;
    view.rerender(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(view.getByLabelText("End brainstorm talk")).toBeTruthy();
    });

    fireEvent.press(view.getByLabelText("End brainstorm talk"));

    await waitFor(() => {
      expect(view.getByText("Ending...")).toBeTruthy();
    });

    await waitFor(() => {
      expect(view.getByLabelText("Finalizing brainstorm talk")).toBeTruthy();
      expect(view.getByText("Finalizing...")).toBeTruthy();
    });

    await act(async () => {
      resolveFinalize?.();
      await Promise.resolve();
    });
  });
});
