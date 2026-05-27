import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, Platform } from "react-native";
import fs from "node:fs";
import path from "node:path";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioRecorderState } from "expo-audio";
import SecondBrainScreen from "../SecondBrainScreen";
import { sortEntriesByUpdatedAt } from "../SecondBrainScreen";
import { apiRequest, isLikelyOfflineError } from "../../api";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
  buildApiUrl: jest.fn((path) => `http://localhost:3000/api${path}`),
  createAuthHeaders: jest.fn((token) =>
    token ? { Authorization: `Bearer ${token}` } : undefined,
  ),
  isLikelyOfflineError: jest.fn(() => false),
}));

describe("SecondBrainScreen", () => {
  const token = "token";
  const originalFetch = global.fetch;
  const originalPrompt = global.prompt;
  const originalPlatformOs = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useAudioRecorderState.mockReturnValue({ isRecording: false });
    apiRequest.mockImplementation(async () => ({}));
    isLikelyOfflineError.mockImplementation(() => false);
    if (typeof AsyncStorage?.clear === "function") {
      AsyncStorage.clear();
    }
    global.fetch = jest.fn();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    global.fetch = originalFetch;
    global.prompt = originalPrompt;
    Object.defineProperty(Platform, "OS", {
      value: originalPlatformOs,
      configurable: true,
    });
  });

  it("sorts entries by updated_at descending with created_at fallback", () => {
    const sorted = sortEntriesByUpdatedAt([
      { id: 1, created_at: 100, updated_at: 120 },
      { id: 2, created_at: 200 },
      { id: 3, created_at: 90, updated_at: 180 },
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual([2, 3, 1]);
  });

  it("archives an entry and updates button label", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const entry = {
      id: 42,
      title: "Ship tests",
      summary: "Write behavior checks",
      is_archived: false,
    };
    const archived = { ...entry, is_archived: true };

    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/entries?limit=60") return { entries: [entry] };
      if (url === "/entries?id=42" && options.method === "PATCH")
        return archived;
      return {};
    });

    const { getByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText("Ship tests")).toBeTruthy());
    fireEvent.press(getByText("Archive"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Archive entry?",
      "This will move the entry to Archived/Done.",
      expect.any(Array),
    );
    const alertActions = alertSpy.mock.calls.at(-1)?.[2] ?? [];
    const archiveAction = alertActions.find(
      (action) => action.text === "Archive",
    );
    archiveAction?.onPress?.();

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/entries?id=42",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    alertSpy.mockRestore();
  });

  it("shows 'Mark done?' confirmation when archiving a reminder", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const entry = {
      id: 77,
      title: "Pay bill",
      summary: "Due tonight",
      category: "reminder",
      is_archived: false,
    };
    const archived = { ...entry, is_archived: true };

    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/entries?limit=60") return { entries: [entry] };
      if (url === "/entries?id=77" && options.method === "PATCH")
        return archived;
      return {};
    });

    const { getByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText("Pay bill")).toBeTruthy());
    fireEvent.press(getByText("Mark Done"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Mark done?",
      "This will move the entry to Archived/Done.",
      expect.any(Array),
    );

    alertSpy.mockRestore();
  });

  it("loads entries once on mount without re-fetch loop", async () => {
    const entries = [
      { id: 1, title: "One", summary: "first", is_archived: false },
    ];

    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries };
      if (url === "/tags") return { tags: ["work"] };
      if (url === "/settings") return {};
      return {};
    });

    const { getByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText("One")).toBeTruthy());

    const entryLoadCalls = apiRequest.mock.calls.filter(
      ([url]) => url === "/entries?limit=60",
    );
    expect(entryLoadCalls).toHaveLength(1);
  });

  it("routes /brainstorm input to brainstorm screen", async () => {
    const navigate = jest.fn();
    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries: [] };
      if (url === "/tags") return { tags: [] };
      if (url === "/settings") return {};
      return {};
    });

    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate }} />,
    );

    fireEvent.press(getByLabelText("Expand typebar"));
    fireEvent.changeText(
      getByPlaceholderText("Type a note, reminder or thought..."),
      "/brainstorm",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("SecondBrainBrainstorm");
    });
  });

  it("renders the main typebar without inline height state", async () => {
    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries: [] };
      if (url === "/tags") return { tags: [] };
      if (url === "/settings") return {};
      return {};
    });

    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    fireEvent.press(getByLabelText("Expand typebar"));
    const input = getByPlaceholderText("Type a note, reminder or thought...");

    expect(input.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 38 })]),
    );
    expect(input.props.style).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ height: expect.any(Number) }),
      ]),
    );
  });

  it("does not route /brainstorm input while offline", async () => {
    const navigate = jest.fn();
    const nowTs = Math.floor(Date.now() / 1000);
    const savedSnapshot = {
      version: 1,
      entries: [
        {
          id: 7,
          title: "Offline note",
          summary: "Saved snapshot",
          raw_text: "Saved snapshot",
          is_archived: false,
          category: "note",
          created_at: nowTs,
        },
      ],
      userTags: ["work"],
      queue: [],
    };

    jest
      .spyOn(AsyncStorage, "getItem")
      .mockImplementation(async () => JSON.stringify(savedSnapshot));
    jest.spyOn(AsyncStorage, "setItem").mockImplementation(async () => {});
    isLikelyOfflineError.mockImplementation(() => true);
    apiRequest.mockImplementation(async () => {
      throw new Error("Network request failed");
    });

    const { getByPlaceholderText, getByLabelText, getByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate }} />,
    );

    await waitFor(() =>
      expect(getByText("Offline · no changes queued")).toBeTruthy(),
    );
    fireEvent.press(getByLabelText("Expand typebar"));
    fireEvent.changeText(
      getByPlaceholderText("Type a note, reminder or thought..."),
      "/brainstorm",
    );
    fireEvent.press(getByLabelText("Enter note"));

    expect(navigate).not.toHaveBeenCalledWith("SecondBrainBrainstorm");
    expect(getByText("Brainstorm is unavailable while offline.")).toBeTruthy();
  });

  it("navigates to queued edits screen when offline banner is pressed", async () => {
    const navigate = jest.fn();
    const nowTs = Math.floor(Date.now() / 1000);
    const savedSnapshot = {
      version: 1,
      entries: [
        {
          id: 7,
          title: "Offline note",
          summary: "Saved snapshot",
          raw_text: "Saved snapshot",
          is_archived: false,
          category: "note",
          created_at: nowTs,
        },
      ],
      userTags: ["work"],
      queue: [{ type: "create", description: "Queued change" }],
    };

    jest
      .spyOn(AsyncStorage, "getItem")
      .mockImplementation(async () => JSON.stringify(savedSnapshot));
    jest.spyOn(AsyncStorage, "setItem").mockImplementation(async () => {});
    isLikelyOfflineError.mockImplementation(() => true);
    apiRequest.mockImplementation(async () => {
      throw new Error("Network request failed");
    });

    const { getByTestId } = render(
      <SecondBrainScreen token={token} navigation={{ navigate }} />,
    );

    await waitFor(() =>
      expect(getByTestId("offline-banner-pressable")).toBeTruthy(),
    );
    fireEvent.press(getByTestId("offline-banner-pressable"));
    expect(navigate).toHaveBeenCalledWith("SecondBrainQueuedEdits");
  });

  it("shows offline queued count on banner and keeps queued edits off the main screen", async () => {
    const nowTs = Math.floor(Date.now() / 1000);
    const savedSnapshot = {
      version: 1,
      entries: [
        {
          id: 7,
          title: "Offline note",
          summary: "Saved snapshot",
          raw_text: "Saved snapshot",
          is_archived: false,
          category: "note",
          created_at: nowTs,
        },
      ],
      userTags: ["work"],
      queue: [
        {
          type: "create",
          description: "Queued draft entry",
          queue_id: "q-offline-1",
          queued_at: Date.now(),
        },
      ],
    };

    jest
      .spyOn(AsyncStorage, "getItem")
      .mockImplementation(async () => JSON.stringify(savedSnapshot));
    jest.spyOn(AsyncStorage, "setItem").mockImplementation(async () => {});
    isLikelyOfflineError.mockImplementation(() => true);
    apiRequest.mockImplementation(async () => {
      throw new Error("Network request failed");
    });

    const { getByText, queryByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() =>
      expect(getByText("Offline · 1 change queued")).toBeTruthy(),
    );
    expect(queryByText("Queued edits")).toBeNull();
    expect(queryByText("Queued draft entry")).toBeNull();
  });

  it("shows centered loading thoughts state while entries are being fetched", async () => {
    let resolveEntries;
    let resolveTags;
    const entriesPromise = new Promise((resolve) => {
      resolveEntries = resolve;
    });
    const tagsPromise = new Promise((resolve) => {
      resolveTags = resolve;
    });

    apiRequest.mockImplementation((url) => {
      if (url === "/entries?limit=60") return entriesPromise;
      if (url === "/tags") return tagsPromise;
      if (url === "/settings") return {};
      return {};
    });

    const { getByText, queryByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    expect(getByText("Loading thoughts...")).toBeTruthy();

    await act(async () => {
      resolveEntries({ entries: [] });
      resolveTags({ tags: [] });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(queryByText("Loading thoughts...")).toBeNull();
    });
  });

  it("renders recording timer as one-line elapsed/max label", async () => {
    useAudioRecorderState.mockReturnValue({ isRecording: true });
    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries: [] };
      if (url === "/tags") return { tags: [] };
      if (url === "/settings") return {};
      return {};
    });

    const { getByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => {
      expect(getByText("0:00/2:00")).toBeTruthy();
    });
  });

  it("uses shared creating status while submitting a voice recording", async () => {
    useAudioRecorderState.mockReturnValue({ isRecording: true });
    let resolveVoice;
    const voicePromise = new Promise((resolve) => {
      resolveVoice = resolve;
    });

    apiRequest.mockImplementation((url) => {
      if (url === "/entries?limit=60") return Promise.resolve({ entries: [] });
      if (url === "/tags") return Promise.resolve({ tags: [] });
      if (url === "/settings") return Promise.resolve({});
      if (url === "/voice") return voicePromise;
      return Promise.resolve({});
    });

    const { getByLabelText, getByText, queryByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => {
      expect(getByLabelText("Stop and submit voice note")).toBeTruthy();
    });

    fireEvent.press(getByLabelText("Stop and submit voice note"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/voice",
        expect.objectContaining({
          method: "POST",
          token,
          body: expect.objectContaining({
            audio_base64: expect.any(String),
            extension: "m4a",
            duration_seconds: expect.any(Number),
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(getByText("Creating ...")).toBeTruthy();
    });

    await act(async () => {
      resolveVoice({
        entry: { id: 123, title: "Voice note", is_archived: false },
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(queryByText("Creating ...")).toBeNull();
    });
  });

  it("reloads entries with cache bypass when screen regains focus", async () => {
    const focusListeners = [];
    const navigation = {
      navigate: jest.fn(),
      addListener: jest.fn((eventName, callback) => {
        if (eventName === "focus") focusListeners.push(callback);
        return jest.fn();
      }),
    };

    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries: [] };
      if (url === "/tags") return { tags: [] };
      if (url === "/settings") return {};
      return {};
    });

    render(<SecondBrainScreen token={token} navigation={navigation} />);

    await waitFor(() => {
      expect(navigation.addListener).toHaveBeenCalledWith(
        "focus",
        expect.any(Function),
      );
    });

    expect(focusListeners).toHaveLength(1);
    await act(async () => {
      focusListeners[0]();
    });

    await waitFor(() => {
      const entryLoadCalls = apiRequest.mock.calls.filter(
        ([url]) => url === "/entries?limit=60",
      );
      expect(entryLoadCalls).toHaveLength(2);
      expect(entryLoadCalls[1][1]).toEqual(
        expect.objectContaining({
          token,
          cache: expect.objectContaining({ bypass: true }),
        }),
      );
    });
  });

  it("prompts before deleting an entry from swipe action", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const entry = {
      id: 42,
      title: "Ship tests",
      summary: "Write behavior checks",
      is_archived: false,
    };

    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/entries?limit=60") return { entries: [entry] };
      if (url === "/entries?id=42" && options.method === "DELETE") return {};
      return {};
    });

    const { getByText, queryByText, getByTestId } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText("Ship tests")).toBeTruthy());
    fireEvent.press(getByTestId("entry-swipe-delete-42"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Delete entry?",
      "This action cannot be undone.",
      expect.any(Array),
    );
    const alertActions = alertSpy.mock.calls.at(-1)?.[2] ?? [];
    const deleteAction = alertActions.find(
      (action) => action.text === "Delete",
    );
    deleteAction?.onPress?.();
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/entries?id=42",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
    expect(queryByText("Confirm")).toBeNull();
    alertSpy.mockRestore();
  });

  it("navigates to entry edit screen on edit action", async () => {
    const entry = {
      id: 42,
      title: "Ship tests",
      summary: "Write behavior checks",
      raw_text: "Write behavior checks",
      is_archived: false,
    };
    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries: [entry] };
      return {};
    });
    const navigate = jest.fn();

    const { getByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate }} />,
    );
    await waitFor(() => expect(getByText("Ship tests")).toBeTruthy());

    fireEvent.press(getByText("Edit"));

    expect(navigate).toHaveBeenCalledWith("SecondBrainEditEntry", {
      entryId: 42,
      entry: expect.objectContaining({ id: 42 }),
    });
  });

  it("navigates to entry detail screen on card press", async () => {
    const entry = {
      id: 42,
      title: "Ship tests",
      summary: "Write behavior checks",
      raw_text: "Full detail content",
      is_archived: false,
    };

    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries: [entry] };
      return {};
    });
    const navigate = jest.fn();

    const { getByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate }} />,
    );

    await waitFor(() => expect(getByText("Ship tests")).toBeTruthy());
    fireEvent.press(getByText("Ship tests"));

    expect(navigate).toHaveBeenCalledWith("SecondBrainEntryDetails", {
      entryId: 42,
      entry: expect.objectContaining({ id: 42 }),
    });
  });

  it("navigates to entry detail screen for imported LLM conversations", async () => {
    const entry = {
      id: 77,
      title: "Claude thread",
      summary: "Imported",
      raw_text: JSON.stringify({
        _format: "chat_conversation_v1",
        source: "claude",
        messages: [
          { sender: "human", text: "Please summarize **this**" },
          { sender: "assistant", text: "Here is a summary." },
        ],
      }),
      is_archived: false,
    };

    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries: [entry] };
      return {};
    });
    const navigate = jest.fn();

    const { getByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate }} />,
    );

    await waitFor(() => expect(getByText("Claude thread")).toBeTruthy());
    fireEvent.press(getByText("Claude thread"));

    expect(navigate).toHaveBeenCalledWith("SecondBrainEntryDetails", {
      entryId: 77,
      entry: expect.objectContaining({ id: 77 }),
    });
  });

  it("creates an entry from composer input and reloads list", async () => {
    const created = {
      id: 100,
      title: "New note",
      summary: "created from composer",
      is_archived: false,
      category: "note",
      created_at: Math.floor(Date.now() / 1000),
    };

    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/entries?limit=60") {
        if (options.method === "POST") return {};
        return { entries: created.id ? [created] : [] };
      }
      if (url === "/settings") return {};
      if (url === "/entries") return {};
      return {};
    });

    const { getByPlaceholderText, getByText, getByLabelText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/entries?limit=60",
        expect.objectContaining({ token }),
      );
    });

    fireEvent.press(getByLabelText("Expand typebar"));
    fireEvent.changeText(
      getByPlaceholderText("Type a note, reminder or thought..."),
      "  created from composer  ",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/entries", {
        method: "POST",
        token,
        body: { description: "created from composer" },
      });
      expect(getByText("created from composer")).toBeTruthy();
    });
  });

  it("bypasses cache when reloading entries after creating a new entry", async () => {
    const created = {
      id: 101,
      title: "Fresh note",
      summary: "shows immediately",
      is_archived: false,
      category: "note",
      created_at: Math.floor(Date.now() / 1000),
    };
    let createCompleted = false;

    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/entries?limit=60") {
        return { entries: createCompleted ? [created] : [] };
      }
      if (url === "/tags") return { tags: [] };
      if (url === "/settings") return {};
      if (url === "/entries" && options.method === "POST") {
        createCompleted = true;
        return {};
      }
      return {};
    });

    const { getByPlaceholderText, getByLabelText, getByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/entries?limit=60",
        expect.objectContaining({ token }),
      ),
    );

    fireEvent.press(getByLabelText("Expand typebar"));
    fireEvent.changeText(
      getByPlaceholderText("Type a note, reminder or thought..."),
      "shows immediately",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith("/entries?limit=60", {
        token,
        cache: expect.objectContaining({ bypass: true }),
      }),
    );
    expect(getByText("shows immediately")).toBeTruthy();
  });

  it("filters entries by selected tag and toggles off on second press", async () => {
    const entries = [
      {
        id: 1,
        title: "Work item",
        summary: "for work",
        is_archived: false,
        category: "note",
        tags: ["work"],
      },
      {
        id: 2,
        title: "Home item",
        summary: "for home",
        is_archived: false,
        category: "note",
        tags: ["home"],
      },
    ];

    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries };
      if (url === "/settings") return {};
      return {};
    });

    const { getByText, getAllByText, queryByText, getByTestId } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText("Work item")).toBeTruthy());
    expect(getByText("Home item")).toBeTruthy();

    fireEvent.press(getByTestId("tag-filter-work"));
    expect(getAllByText("Work item").length).toBeGreaterThan(0);
    expect(queryByText("Home item")).toBeNull();

    fireEvent.press(getByTestId("tag-filter-work"));
    expect(getAllByText("Work item").length).toBeGreaterThan(0);
    expect(getByText("Home item")).toBeTruthy();
  });

  it("filters entries by search input", async () => {
    const entries = [
      {
        id: 1,
        title: "Budget planning",
        summary: "Q3 spreadsheet",
        raw_text: "Forecast and allocation",
        is_archived: false,
        category: "note",
        tags: ["finance"],
      },
      {
        id: 2,
        title: "Workout plan",
        summary: "Leg day",
        raw_text: "Squats and lunges",
        is_archived: false,
        category: "note",
        tags: ["health"],
      },
    ];

    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries };
      if (url === "/settings") return {};
      return {};
    });

    const { getByText, queryByText, getByPlaceholderText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText("Budget planning")).toBeTruthy());
    expect(getByText("Workout plan")).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText("Search entries..."), "budget");
    expect(getByText("Budget planning")).toBeTruthy();
    expect(queryByText("Workout plan")).toBeNull();

    fireEvent.changeText(getByPlaceholderText("Search entries..."), "health");
    expect(queryByText("Budget planning")).toBeNull();
    expect(getByText("Workout plan")).toBeTruthy();
  });

  it("downloads .ics via absolute API base path", async () => {
    const reminderEntry = {
      id: 42,
      title: "Doctor appointment",
      summary: "Tomorrow 9am",
      raw_text: "Bring documents",
      is_archived: false,
      category: "reminder",
      remind_at: 1893459600,
    };

    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries: [reminderEntry] };
      if (url === "/settings") return {};
      return {};
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
    });

    const { getByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText("Doctor appointment")).toBeTruthy());
    fireEvent.press(getByText("Add to Calendar"));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [requestUrl, requestOptions] = global.fetch.mock.calls[0];
    expect(requestUrl).toBe("http://localhost:3000/api/ics?id=42");
    expect(requestOptions?.headers?.Authorization).toBe(`Bearer ${token}`);
  });

  it("uses the non-legacy expo filesystem File API for calendar export", () => {
    const screenPath = path.resolve(__dirname, "../SecondBrainScreen.js");
    const source = fs.readFileSync(screenPath, "utf8");

    expect(source).toContain('import { File, Paths } from "expo-file-system";');
    expect(source).toContain("const file = new File(Paths.cache, fileName);");
    expect(source).toContain("file.write(icsContent);");
    expect(source).not.toContain("writeAsStringAsync");
  });

  it("groups typebar props into a named object and spreads it", () => {
    const screenPath = path.resolve(__dirname, "../SecondBrainScreen.js");
    const source = fs.readFileSync(screenPath, "utf8");

    expect(source).toContain("const typebarProps = {");
    expect(source).toContain("<SecondBrainTypebar {...typebarProps}>");
    expect(source).toContain("onSubmitDraft: createEntry,");
    expect(source).toContain("startVoiceCapture,");
    expect(source).toContain("saveSettings,");
  });

  it("groups filter dropdown props into a named object and spreads it", () => {
    const screenPath = path.resolve(__dirname, "../SecondBrainScreen.js");
    const source = fs.readFileSync(screenPath, "utf8");

    expect(source).toContain("const filterDropdownProps = {");
    expect(source).toContain(
      "<SecondBrainFilterDropdown {...filterDropdownProps} />",
    );
    expect(source).toContain("setFilterDropdownOpenedAtMs,");
    expect(source).toContain("clearFilters,");
    expect(source).toContain("creatingEntries,");
    expect(source).toContain("offlineBanner:");
    expect(source).toContain("errorBanner:");
  });

  it("forces bypass-cache reload for initial and voice-triggered refreshes", () => {
    const screenPath = path.resolve(__dirname, "../SecondBrainScreen.js");
    const source = fs.readFileSync(screenPath, "utf8");

    expect(source).toContain("await loadEntries({ bypassCache: true });");
    expect(source).toContain("loadEntries({ bypassCache: true });");
  });

  it("delegates list row rendering to SecondBrainFlatList", () => {
    const screenPath = path.resolve(__dirname, "../SecondBrainScreen.js");
    const source = fs.readFileSync(screenPath, "utf8");

    expect(source).not.toContain("const renderListItem = useCallback(");
    expect(source).toContain("busyId={busyId}");
    expect(source).toContain("openSwipeId={openSwipeId}");
    expect(source).toContain(
      "toggleArchiveWithConfirmation={toggleArchiveWithConfirmation}",
    );
  });

  it("shows native offline banner and queued sync count when loading saved entries offline", async () => {
    const nowTs = Math.floor(Date.now() / 1000);
    const savedSnapshot = {
      version: 1,
      entries: [
        {
          id: 7,
          title: "Offline note",
          summary: "Saved snapshot",
          raw_text: "Saved snapshot",
          is_archived: false,
          category: "note",
          created_at: nowTs,
        },
      ],
      userTags: ["work"],
      queue: [
        { type: "create", description: "queued create" },
        { type: "delete", id: 99 },
      ],
    };

    jest
      .spyOn(AsyncStorage, "getItem")
      .mockImplementation(async () => JSON.stringify(savedSnapshot));
    jest.spyOn(AsyncStorage, "setItem").mockImplementation(async () => {});
    isLikelyOfflineError.mockImplementation(() => true);
    apiRequest.mockImplementation(async () => {
      throw new Error("Network request failed");
    });

    const { getByText, getByTestId } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText("Offline note")).toBeTruthy());
    expect(getByTestId("offline-banner")).toBeTruthy();
    expect(getByText("Offline · 2 changes queued")).toBeTruthy();
  });

  it("hides offline-mode error banner copy while preserving the yellow offline banner", async () => {
    const nowTs = Math.floor(Date.now() / 1000);
    const savedSnapshot = {
      version: 1,
      entries: [
        {
          id: 7,
          title: "Offline note",
          summary: "Saved snapshot",
          raw_text: "Saved snapshot",
          is_archived: false,
          category: "note",
          created_at: nowTs,
        },
      ],
      userTags: ["work"],
      queue: [],
    };

    jest
      .spyOn(AsyncStorage, "getItem")
      .mockImplementation(async () => JSON.stringify(savedSnapshot));
    jest.spyOn(AsyncStorage, "setItem").mockImplementation(async () => {});
    isLikelyOfflineError.mockImplementation(() => true);
    apiRequest.mockImplementation(async () => {
      throw new Error("Network request failed");
    });

    const { getByText, queryByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() => expect(getByText("Offline note")).toBeTruthy());
    expect(getByText("Offline · no changes queued")).toBeTruthy();
    expect(queryByText("Offline mode: showing saved entries.")).toBeNull();
  });

  it("shows ChatGPT share import timeout on SecondBrainScreen after modal closes", async () => {
    Object.defineProperty(Platform, "OS", {
      value: "web",
      configurable: true,
    });
    global.prompt = jest.fn(() => "https://chatgpt.com/share/abc");

    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/entries?limit=60") return { entries: [] };
      if (url === "/tags") return { tags: [] };
      if (url === "/settings") return {};
      if (url === "/import-llm-share" && options.method === "POST") {
        throw new Error(
          "Timed out while loading the ChatGPT shared conversation",
        );
      }
      return {};
    });

    const { getByLabelText, getByText, queryByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    fireEvent.press(getByLabelText("Expand typebar"));
    await waitFor(() => expect(getByLabelText("Open settings")).toBeTruthy());
    fireEvent.press(getByLabelText("Open settings"));
    await waitFor(() => expect(getByText("Settings")).toBeTruthy());

    fireEvent.press(getByText("Import LLM Conversation History"));

    await waitFor(() => {
      expect(queryByText("Settings")).toBeNull();
      expect(
        getByText(
          "Timed out while loading the ChatGPT shared conversation. Please retry the import in SecondBrain.",
        ),
      ).toBeTruthy();
    });
  });

  it("prioritizes existing screen error over import error text", async () => {
    Object.defineProperty(Platform, "OS", {
      value: "web",
      configurable: true,
    });
    global.prompt = jest.fn(() => "https://chatgpt.com/share/abc");

    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/entries?limit=60") {
        throw new Error("Failed to load entries");
      }
      if (url === "/tags") return { tags: [] };
      if (url === "/settings") return {};
      if (url === "/import-llm-share" && options.method === "POST") {
        throw new Error(
          "Timed out while loading the ChatGPT shared conversation",
        );
      }
      return {};
    });

    const { getByLabelText, getByText, queryByText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    await waitFor(() =>
      expect(getByText("Failed to load entries")).toBeTruthy(),
    );
    fireEvent.press(getByLabelText("Expand typebar"));
    fireEvent.press(getByLabelText("Open settings"));
    await waitFor(() => expect(getByText("Settings")).toBeTruthy());

    fireEvent.press(getByText("Import LLM Conversation History"));

    await waitFor(() => {
      expect(getByText("Failed to load entries")).toBeTruthy();
      expect(
        queryByText(
          "Timed out while loading the ChatGPT shared conversation. Please retry the import in SecondBrain.",
        ),
      ).toBeNull();
    });
  });

  it("keeps settings action visible while typebar input is focused", async () => {
    const { getByLabelText, getByPlaceholderText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    fireEvent.press(getByLabelText("Expand typebar"));
    const input = getByPlaceholderText("Type a note, reminder or thought...");
    fireEvent(input, "focus");

    expect(getByLabelText("Open settings")).toBeTruthy();
  });

  it("keeps microphone visible after expanding and collapsing the typebar", async () => {
    const { getByLabelText, getByPlaceholderText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />,
    );

    expect(getByLabelText("Record voice note")).toBeTruthy();

    fireEvent.press(getByLabelText("Expand typebar"));
    const input = getByPlaceholderText("Type a note, reminder or thought...");
    fireEvent(input, "focus");
    fireEvent.press(getByLabelText("Collapse typebar"));

    expect(getByLabelText("Record voice note")).toBeTruthy();
  });

  it("navigates to voice capture screen when mic button is pressed", async () => {
    const navigate = jest.fn();
    const { getByLabelText } = render(
      <SecondBrainScreen token={token} navigation={{ navigate }} />,
    );

    fireEvent.press(getByLabelText("Record voice note"));

    expect(navigate).toHaveBeenCalledWith("SecondBrainVoiceCapture");
  });
});
