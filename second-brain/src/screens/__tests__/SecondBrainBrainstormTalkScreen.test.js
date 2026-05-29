import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAudioRecorder, useAudioRecorderState } from "expo-audio";
import SecondBrainBrainstormTalkScreen from "../SecondBrainBrainstormTalkScreen";
import { apiRequest } from "../../api";
import { transcribeBrainstormTalkAudio } from "../../services/unrealSpeechService";

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
        messages: [
          {
            id: "m-1",
            role: "user",
            content: "Starting idea",
            createdAt: new Date().toISOString(),
          },
        ],
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

  it("shows idle state and listen control by default", async () => {
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
    expect(view.getByText("Idle")).toBeTruthy();
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
  });

  it("finalizes /end exactly once when submitted repeatedly", async () => {
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

    fireEvent.press(view.getByLabelText("End brainstorm talk"));
    fireEvent.press(view.getByLabelText("End brainstorm talk"));

    await waitFor(() => {
      expect(goBack).toHaveBeenCalledTimes(1);
    });

    const summaryCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/brainstorm" && options?.method === "POST",
    );
    expect(summaryCalls).toHaveLength(1);
  });

  it("navigates to SecondBrain on /end when no back stack exists", async () => {
    const goBack = jest.fn();
    const navigate = jest.fn();
    const view = render(
      <SecondBrainBrainstormTalkScreen
        route={{ params: {} }}
        navigation={{ canGoBack: () => false, goBack, navigate }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.press(view.getByLabelText("End brainstorm talk"));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("SecondBrain");
    });
    expect(goBack).not.toHaveBeenCalled();
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

  it("pauses and transcribes without navigating away from the talk screen", async () => {
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
      expect(view.getByText("Paused")).toBeTruthy();
      expect(view.getByLabelText("Continue listening")).toBeTruthy();
    });

    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("resumes listening when mic is pressed from paused state", async () => {
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
      expect(view.getByLabelText("Continue listening")).toBeTruthy();
    });

    fireEvent.press(view.getByLabelText("Continue listening"));

    await waitFor(() => {
      expect(recorder.record).toHaveBeenCalled();
    });
    expect(view.getByText("Listening")).toBeTruthy();
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(apiRequest).not.toHaveBeenCalledWith(
      "/brainstorm",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ message: "hello" }),
      }),
    );
  });
});
