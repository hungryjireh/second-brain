import { useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { Alert, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSecondBrainSettings } from "../useSecondBrainSettings";
import { apiRequest } from "../../api";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
}));

describe("useSecondBrainSettings", () => {
  let latestValue = null;
  const token = "token";
  const setEntries = jest.fn();
  const setCreatingEntries = jest.fn();
  const originalDocument = global.document;
  const originalPlatformOs = Platform.OS;
  const originalPrompt = global.prompt;

  function Harness() {
    const value = useSecondBrainSettings({
      token,
      setEntries,
      setCreatingEntries,
    });
    useEffect(() => {
      latestValue = value;
    }, [value]);
    return null;
  }

  beforeEach(() => {
    latestValue = null;
    jest.clearAllMocks();
    apiRequest.mockResolvedValue({});
    setCreatingEntries.mockReset();
  });

  afterEach(() => {
    if (originalDocument === undefined) delete global.document;
    else global.document = originalDocument;
    if (originalPrompt === undefined) delete global.prompt;
    else global.prompt = originalPrompt;
    Object.defineProperty(Platform, "OS", {
      value: originalPlatformOs,
      configurable: true,
    });
  });

  it("loads timezone from settings endpoint", async () => {
    apiRequest.mockImplementation(async (url) => {
      if (url === "/settings") return { timezone: "UTC" };
      return {};
    });

    render(<Harness />);

    await waitFor(() => {
      expect(latestValue.timezone).toBe("UTC");
      expect(latestValue.timezoneDraft).toBe("UTC");
    });
  });

  it("validates timezone and saves settings", async () => {
    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/settings" && !options.method) return {};
      if (url === "/settings" && options.method === "PATCH") {
        return { timezone: "Asia/Tokyo" };
      }
      return {};
    });

    render(<Harness />);

    act(() => {
      latestValue.openSettings();
      latestValue.handleTimezoneChange("   ");
    });
    await act(async () => {
      await latestValue.saveSettings();
    });
    await waitFor(() => {
      expect(latestValue.timezoneError).toBe("Timezone is required.");
    });

    await act(async () => {
      latestValue.handleTimezoneChange("Asia/Tokyo");
    });
    await waitFor(() => {
      expect(latestValue.timezoneDraft).toBe("Asia/Tokyo");
    });
    await act(async () => {
      await latestValue.saveSettings();
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/settings",
      expect.objectContaining({
        method: "PATCH",
        token,
        body: { timezone: "Asia/Tokyo" },
      }),
    );
    expect(latestValue.timezone).toBe("Asia/Tokyo");
    expect(latestValue.settingsOpen).toBe(false);
  });

  it("generates and copies telegram link key", async () => {
    apiRequest.mockImplementation(async (url) => {
      if (url === "/settings") return {};
      if (url === "/telegram/link-key") return { key: "abc123" };
      return {};
    });
    Clipboard.setStringAsync.mockResolvedValue(undefined);

    render(<Harness />);

    await act(async () => {
      await latestValue.generateTelegramLinkKey();
    });
    expect(latestValue.telegramLinkKey).toBe("abc123");

    await act(async () => {
      await latestValue.copyTelegramLinkKey();
    });
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("abc123");
    expect(latestValue.telegramCopyStatus).toBe("Copied");
  });

  it("resets modal fields when opening settings and closes when requested", async () => {
    apiRequest.mockImplementation(async (url) => {
      if (url === "/settings") return {};
      if (url === "/telegram/link-key") return { key: "temp-key" };
      return {};
    });

    render(<Harness />);

    await act(async () => {
      await latestValue.generateTelegramLinkKey();
    });
    await waitFor(() => {
      expect(latestValue.telegramLinkKey).toBe("temp-key");
    });
    await act(async () => {
      await latestValue.copyTelegramLinkKey();
    });
    expect(latestValue.telegramLinkKey).toBe("temp-key");
    expect(latestValue.telegramCopyStatus).toBe("Copied");

    act(() => {
      latestValue.openSettings();
    });

    expect(latestValue.settingsOpen).toBe(true);
    expect(latestValue.telegramLinkKey).toBe("");
    expect(latestValue.telegramCopyStatus).toBe("");
    expect(latestValue.telegramLinkError).toBe("");

    act(() => {
      latestValue.closeSettings();
    });
    expect(latestValue.settingsOpen).toBe(false);
  });

  it("shows non-web import alert outside web platform", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    Object.defineProperty(Platform, "OS", {
      value: "ios",
      configurable: true,
    });

    render(<Harness />);

    act(() => {
      latestValue.handleOpenImportDialog();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Import LLM conversations",
      "Uploading JSON is currently available on web.",
    );
    alertSpy.mockRestore();
  });

  it("imports conversations on web and updates entries", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const input = {
      type: "",
      accept: "",
      onchange: null,
      click: jest.fn(),
      value: "selected",
    };
    global.document = {
      createElement: jest.fn(() => input),
    };
    Object.defineProperty(Platform, "OS", {
      value: "web",
      configurable: true,
    });
    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/settings" && !options.method) return {};
      if (url === "/entries" && options.method === "POST") {
        return {
          created: [{ id: 55, created_at: 200, updated_at: 200 }],
        };
      }
      return {};
    });

    render(<Harness />);
    act(() => {
      latestValue.openSettings();
    });
    expect(latestValue.settingsOpen).toBe(true);

    act(() => {
      latestValue.handleOpenImportDialog();
    });
    expect(input.click).toHaveBeenCalled();
    expect(input.type).toBe("file");
    expect(input.accept).toBe(".json,application/json");

    const file = {
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify([{ title: "Conversation" }])),
    };
    await act(async () => {
      await input.onchange({ target: { files: [file] } });
    });

    expect(latestValue.settingsOpen).toBe(false);

    expect(apiRequest).toHaveBeenCalledWith(
      "/entries",
      expect.objectContaining({
        method: "POST",
        token,
        body: expect.objectContaining({
          import_format: "llm_conversations",
          conversations: [{ title: "Conversation" }],
        }),
      }),
    );
    expect(setEntries).toHaveBeenCalledWith(expect.any(Function));
    expect(alertSpy).toHaveBeenCalledWith(
      "Import LLM conversations",
      "Imported 1 conversation.",
    );
    expect(input.value).toBe("");
    expect(setCreatingEntries).toHaveBeenCalledTimes(2);
    expect(setCreatingEntries).toHaveBeenNthCalledWith(1, expect.any(Function));
    expect(setCreatingEntries).toHaveBeenNthCalledWith(2, expect.any(Function));

    const addCreating = setCreatingEntries.mock.calls[0][0];
    const removeCreating = setCreatingEntries.mock.calls[1][0];
    const added = addCreating([]);
    expect(added).toHaveLength(1);
    expect(added[0].title).toBe("conversations");
    expect(removeCreating(added)).toEqual([]);
    alertSpy.mockRestore();
  });

  it("imports ChatGPT share URL on web and updates entries", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    global.prompt = jest.fn(() => "https://chatgpt.com/share/abc");
    Object.defineProperty(Platform, "OS", {
      value: "web",
      configurable: true,
    });
    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/settings" && !options.method) return {};
      if (url === "/import-llm-share" && options.method === "POST") {
        return {
          created: [{ id: 77, created_at: 300, updated_at: 300 }],
        };
      }
      return {};
    });

    render(<Harness />);
    act(() => {
      latestValue.openSettings();
    });
    expect(latestValue.settingsOpen).toBe(true);

    await act(async () => {
      await latestValue.handleImportChatGptShareUrl();
    });

    expect(latestValue.settingsOpen).toBe(false);

    expect(global.prompt).toHaveBeenCalledWith(
      "Paste a ChatGPT or Claude public share URL",
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/import-llm-share",
      expect.objectContaining({
        method: "POST",
        token,
        body: { chat_url: "https://chatgpt.com/share/abc" },
      }),
    );
    expect(setEntries).toHaveBeenCalledWith(expect.any(Function));
    expect(alertSpy).toHaveBeenCalledWith(
      "Import LLM Conversation History",
      "Imported 1 conversation.",
    );
    expect(setCreatingEntries).toHaveBeenCalledTimes(2);
    expect(setCreatingEntries).toHaveBeenNthCalledWith(1, expect.any(Function));
    expect(setCreatingEntries).toHaveBeenNthCalledWith(2, expect.any(Function));

    const addCreating = setCreatingEntries.mock.calls[0][0];
    const removeCreating = setCreatingEntries.mock.calls[1][0];
    const added = addCreating([]);
    expect(added).toHaveLength(1);
    expect(added[0].title).toBe("conversations");
    expect(removeCreating(added)).toEqual([]);
    alertSpy.mockRestore();
  });

  it("shows an error for invalid LLM share URL and does not start import", async () => {
    global.prompt = jest.fn(() => "https://example.com/not-share");
    Object.defineProperty(Platform, "OS", {
      value: "web",
      configurable: true,
    });
    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/settings" && !options.method) return {};
      return {};
    });

    render(<Harness />);
    act(() => {
      latestValue.openSettings();
    });
    expect(latestValue.settingsOpen).toBe(true);

    await act(async () => {
      await latestValue.handleImportChatGptShareUrl();
    });

    expect(latestValue.importError).toBe(
      "Please enter a valid ChatGPT or Claude share URL (https://chatgpt.com/share/... or https://claude.ai/share/...).",
    );
    expect(apiRequest).not.toHaveBeenCalledWith(
      "/import-llm-share",
      expect.anything(),
    );
    expect(latestValue.settingsOpen).toBe(true);
    expect(setCreatingEntries).not.toHaveBeenCalled();
  });

  it("shows non-web ChatGPT share URL import alert outside web platform", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    Object.defineProperty(Platform, "OS", {
      value: "android",
      configurable: true,
    });

    render(<Harness />);

    await act(async () => {
      await latestValue.handleImportChatGptShareUrl();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "Import LLM Conversation History",
      "Importing via URL is currently available on web.",
    );
    alertSpy.mockRestore();
  });

  it("shows retry guidance when ChatGPT share import times out", async () => {
    global.prompt = jest.fn(() => "https://chatgpt.com/share/abc");
    Object.defineProperty(Platform, "OS", {
      value: "web",
      configurable: true,
    });
    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/settings" && !options.method) return {};
      if (url === "/import-llm-share" && options.method === "POST") {
        throw new Error(
          "Timed out while loading the ChatGPT shared conversation",
        );
      }
      return {};
    });

    render(<Harness />);
    act(() => {
      latestValue.openSettings();
    });

    await act(async () => {
      await latestValue.handleImportChatGptShareUrl();
    });

    expect(latestValue.importError).toBe(
      "Timed out while loading the ChatGPT shared conversation. Please retry the import in SecondBrain.",
    );
  });
});
