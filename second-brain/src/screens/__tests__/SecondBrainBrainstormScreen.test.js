import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlatList } from "react-native";
import SecondBrainBrainstormScreen from "../SecondBrainBrainstormScreen";
import { apiRequest } from "../../api";
import { createBrainstormSession } from "../../utils/brainstormSessions";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("../../utils/brainstormSessions", () => {
  let counter = 0;
  const sessionsById = new Map();
  const linkedEntryById = new Map();

  function cloneSession(session) {
    return session ? JSON.parse(JSON.stringify(session)) : session;
  }

  return {
    createBrainstormSession: jest.fn(async ({ entryId = null, seedText = "" } = {}) => {
      counter += 1;
      const session = {
        id: `session-${counter}`,
        entryId,
        lifecycle: "active",
        updatedAt: new Date().toISOString(),
        finalizeGuards: { ended: false, wipSaved: false },
        messages: seedText
          ? [
              {
                id: `seed-${counter}`,
                role: "assistant",
                content: String(seedText),
                createdAt: new Date().toISOString(),
              },
            ]
          : [],
      };
      sessionsById.set(session.id, cloneSession(session));
      return cloneSession(session);
    }),
    getLinkedBrainstormSessionId: jest.fn(async (entryId) => {
      return linkedEntryById.get(Number(entryId)) || "";
    }),
    linkEntryToBrainstormSession: jest.fn(async (entryId, sessionId) => {
      linkedEntryById.set(Number(entryId), sessionId);
    }),
    readBrainstormSession: jest.fn(async (sessionId) => {
      return cloneSession(sessionsById.get(sessionId) || null);
    }),
    toBrainstormTranscript: jest.fn((messages) =>
      (Array.isArray(messages) ? messages : [])
        .map((message) => String(message?.content || ""))
        .filter(Boolean)
        .join("\n"),
    ),
    writeBrainstormSession: jest.fn(async (session) => {
      sessionsById.set(session.id, cloneSession(session));
    }),
  };
});

describe("SecondBrainBrainstormScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("appends user then assistant messages in deterministic order", async () => {
    apiRequest.mockResolvedValue({ reply: "Assistant reply" });

    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const input = getByPlaceholderText("Share your thought, or type /end");
    fireEvent.changeText(input, "Brainstorm this");
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("finalizes once for repeated /end commands", async () => {
    apiRequest
      .mockResolvedValueOnce({ reply: "Assistant reply" })
      .mockResolvedValueOnce({ id: 101, title: "Result" });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "First idea",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => expect(goBack).toHaveBeenCalled());

    const finalizeCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/entries" && options?.method === "POST",
    );
    expect(finalizeCalls.length).toBeGreaterThanOrEqual(1);
    expect(finalizeCalls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          tags: ["brainstorm"],
        }),
      }),
    );
  });

  it("prevents duplicate /end finalize requests from rapid taps", async () => {
    apiRequest
      .mockResolvedValueOnce({ reply: "Assistant reply" })
      .mockResolvedValueOnce({ id: 303, title: "Result" });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "First idea",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    const sendButton = getByLabelText("Enter note");
    fireEvent.press(sendButton);
    fireEvent.press(sendButton);

    await waitFor(() => expect(goBack).toHaveBeenCalled());

    const finalizeCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/entries" && options?.method === "POST",
    );
    expect(finalizeCalls).toHaveLength(1);
  });

  it("prevents duplicate brainstorm requests from rapid Send taps", async () => {
    let resolveBrainstorm;
    const brainstormPromise = new Promise((resolve) => {
      resolveBrainstorm = resolve;
    });
    apiRequest.mockImplementation((path) => {
      if (path === "/brainstorm") return brainstormPromise;
      return Promise.resolve({});
    });

    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "Concurrent send test",
    );
    const sendButton = getByLabelText("Enter note");
    fireEvent.press(sendButton);
    fireEvent.press(sendButton);

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls).toHaveLength(1);
    });

    await act(async () => {
      resolveBrainstorm({ reply: "Assistant reply" });
      await Promise.resolve();
    });
  });

  it("does not duplicate /entries when unmounting during /end finalize", async () => {
    apiRequest.mockResolvedValueOnce({ reply: "Assistant reply" });
    let resolveFinalize;
    const finalizePromise = new Promise((resolve) => {
      resolveFinalize = resolve;
    });
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return finalizePromise;
      }
      return Promise.resolve({});
    });

    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "First idea",
    );
    fireEvent.press(view.getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(view.getByLabelText("Enter note"));

    await act(async () => {
      view.unmount();
    });

    await act(async () => {
      resolveFinalize({ id: 505, title: "Result" });
      await Promise.resolve();
    });

    const finalizeCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/entries" && options?.method === "POST",
    );
    expect(finalizeCalls).toHaveLength(1);
  });

  it("creates a prefixed WIP entry when leaving without /end", async () => {
    apiRequest
      .mockResolvedValueOnce({ reply: "Assistant reply" })
      .mockResolvedValueOnce({ id: 55, title: "Draft title" })
      .mockResolvedValueOnce({});

    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "Unfinished thought",
    );
    fireEvent.press(view.getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });

    await act(async () => {
      view.unmount();
    });

    await waitFor(() => {
      const finalizePostCalls = apiRequest.mock.calls.filter(
        ([path, options]) => path === "/entries" && options?.method === "POST",
      );
      expect(finalizePostCalls.length).toBeGreaterThanOrEqual(1);
      expect(apiRequest).toHaveBeenCalledWith(
        "/entries?id=55",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            title: "[BRAINSTORMING] Draft title",
          }),
        }),
      );
    });
  });

  it("does not finalize when leaving without sending any new chat", async () => {
    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: { seedEntry: { id: 9, raw_text: "Seed context" } } }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      view.unmount();
    });

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("makes no brainstorm or entry API calls when opened and exited immediately", async () => {
    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      view.unmount();
    });

    const brainstormCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/brainstorm" && options?.method === "POST",
    );
    const createEntryCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/entries" && options?.method === "POST",
    );
    const patchEntryCalls = apiRequest.mock.calls.filter(
      ([path, options]) =>
        typeof path === "string" &&
        path.startsWith("/entries?id=") &&
        options?.method === "PATCH",
    );

    expect(brainstormCalls).toHaveLength(0);
    expect(createEntryCalls).toHaveLength(0);
    expect(patchEntryCalls).toHaveLength(0);
  });

  it("renders typebar submit button", async () => {
    const { getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(getByLabelText("Enter note")).toBeTruthy();
  });

  it("keeps FlatList renderItem stable across input-driven rerenders", async () => {
    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const initialRenderItem =
      view.UNSAFE_getByType(FlatList).props.renderItem;

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "Typing updates local state only",
    );

    const nextRenderItem = view.UNSAFE_getByType(FlatList).props.renderItem;
    expect(nextRenderItem).toBe(initialRenderItem);
  });

  it("uses a multiline expanding typebar input", async () => {
    const { getByPlaceholderText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const input = getByPlaceholderText("Share your thought, or type /end");
    expect(input.props.multiline).toBe(true);
    expect(input.props.textAlignVertical).toBe("top");
    expect(input.props.scrollEnabled).toBe(false);
  });

  it("hides microphone controls in brainstorm typebar", async () => {
    const { queryByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByLabelText("Record voice note")).toBeNull();
    expect(queryByLabelText("Stop and submit voice note")).toBeNull();
    expect(queryByLabelText("Preparing voice recorder")).toBeNull();
  });

  it("hides settings control in brainstorm typebar", async () => {
    const { queryByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByLabelText("Open settings")).toBeNull();
  });

  it("does not finalize a continued session when no new message is sent", async () => {
    const existing = await createBrainstormSession({
      entryId: 111,
      seedText: "Existing brainstorm context",
    });
    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: { sessionId: existing.id } }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      view.unmount();
    });

    expect(apiRequest).not.toHaveBeenCalled();
  });
});
