import { useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSecondBrainEntries } from "../useSecondBrainEntries";
import { apiRequest, isLikelyOfflineError } from "../../api";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
  isLikelyOfflineError: jest.fn(() => false),
}));

describe("useSecondBrainEntries", () => {
  let latestValue = null;
  const token = "token";
  const onError = jest.fn();

  function Harness({ authToken, onUpdate, onHookError }) {
    const value = useSecondBrainEntries({
      token: authToken,
      onError: onHookError,
    });

    useEffect(() => {
      onUpdate(value);
    }, [onUpdate, value]);

    return null;
  }

  beforeEach(() => {
    latestValue = null;
    jest.clearAllMocks();
    onError.mockReset();
    if (typeof AsyncStorage?.clear === "function") {
      AsyncStorage.clear();
    }
  });

  it("loads entries and normalizes user tags", async () => {
    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") {
        return {
          entries: [
            { id: 1, created_at: 100, updated_at: 100 },
            { id: 2, created_at: 200 },
          ],
        };
      }
      if (url === "/tags") {
        return { tags: ["# Work ", "home", "HOME"] };
      }
      return {};
    });

    render(
      <Harness
        authToken={token}
        onUpdate={(value) => {
          latestValue = value;
        }}
        onHookError={onError}
      />,
    );

    await act(async () => {
      await latestValue.loadEntries({ bypassCache: true });
    });

    await waitFor(() => {
      expect(latestValue.loadingEntries).toBe(false);
      expect(latestValue.entries.map((item) => item.id)).toEqual([2, 1]);
      expect(latestValue.userTags).toEqual(["home", "work"]);
      expect(latestValue.userTagsLoaded).toBe(true);
      expect(latestValue.offlineMode).toBe(false);
    });
  });

  it("falls back to cached entries when offline", async () => {
    const storageKey = `secondBrainOffline:${token}`;
    const cachedState = {
      version: 1,
      entries: [{ id: 90, created_at: 90, description: "Cached entry" }],
      userTags: ["cachedtag"],
      queue: [{ type: "create", description: "Queued change" }],
    };
    await AsyncStorage.setItem(storageKey, JSON.stringify(cachedState));

    apiRequest.mockImplementation(async () => {
      throw new Error("Network down");
    });
    isLikelyOfflineError.mockReturnValue(true);

    render(
      <Harness
        authToken={token}
        onUpdate={(value) => {
          latestValue = value;
        }}
        onHookError={onError}
      />,
    );

    await act(async () => {
      await latestValue.loadEntries();
    });

    await waitFor(() => {
      expect(latestValue.entries.map((item) => item.id)).toEqual([90]);
      expect(latestValue.userTags).toEqual(["cachedtag"]);
      expect(latestValue.offlineMode).toBe(true);
      expect(latestValue.offlineQueueSize).toBe(1);
      expect(onError).toHaveBeenCalledWith(
        "Offline mode: showing saved entries.",
      );
    });
  });

  it("keeps offline mode enabled when offline and no cached entries exist", async () => {
    apiRequest.mockImplementation(async () => {
      throw new Error("Network down");
    });
    isLikelyOfflineError.mockReturnValue(true);

    render(
      <Harness
        authToken={token}
        onUpdate={(value) => {
          latestValue = value;
        }}
        onHookError={onError}
      />,
    );

    await act(async () => {
      await latestValue.loadEntries();
    });

    await waitFor(() => {
      expect(latestValue.offlineMode).toBe(true);
      expect(onError).toHaveBeenCalledWith(
        "Offline mode: unable to load saved entries.",
      );
    });
  });

  it("queues archive action and updates entry optimistically when offline", async () => {
    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === "/entries?limit=60") {
        return {
          entries: [{ id: 12, is_archived: false, created_at: 100 }],
        };
      }
      if (url === "/tags") return { tags: ["work"] };
      if (url === "/entries?id=12" && options.method === "PATCH") {
        throw new Error("Offline");
      }
      return {};
    });
    isLikelyOfflineError.mockReturnValue(true);

    render(
      <Harness
        authToken={token}
        onUpdate={(value) => {
          latestValue = value;
        }}
        onHookError={onError}
      />,
    );

    await act(async () => {
      await latestValue.loadEntries();
    });

    await act(async () => {
      await latestValue.toggleArchive({
        id: 12,
        is_archived: false,
      });
    });

    const storedRaw = await AsyncStorage.getItem(`secondBrainOffline:${token}`);
    const stored = JSON.parse(storedRaw);

    await waitFor(() => {
      expect(
        latestValue.entries.find((item) => item.id === 12)?.is_archived,
      ).toBe(true);
      expect(latestValue.offlineMode).toBe(true);
      expect(latestValue.offlineQueueSize).toBe(1);
      expect(stored.queue).toEqual([
        { type: "archive", id: 12, is_archived: true },
      ]);
      expect(onError).toHaveBeenCalledWith(
        "Offline mode: changes will sync automatically.",
      );
    });
  });

  it("disables stale-on-error cache fallback for forced refresh loads", async () => {
    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries: [] };
      if (url === "/tags") return { tags: [] };
      return {};
    });

    render(
      <Harness
        authToken={token}
        onUpdate={(value) => {
          latestValue = value;
        }}
        onHookError={onError}
      />,
    );

    await act(async () => {
      await latestValue.loadEntries({ bypassCache: true });
    });

    const entriesCall = apiRequest.mock.calls.find(
      ([url]) => url === "/entries?limit=60",
    );
    const tagsCall = apiRequest.mock.calls.find(([url]) => url === "/tags");

    expect(entriesCall?.[1]?.cache?.bypass).toBe(true);
    expect(entriesCall?.[1]?.cache?.staleOnError).toBe(false);
    expect(tagsCall?.[1]?.cache?.bypass).toBe(true);
    expect(tagsCall?.[1]?.cache?.staleOnError).toBe(false);
  });

  it("keeps stale-on-error cache fallback enabled for non-forced loads", async () => {
    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") return { entries: [] };
      if (url === "/tags") return { tags: [] };
      return {};
    });

    render(
      <Harness
        authToken={token}
        onUpdate={(value) => {
          latestValue = value;
        }}
        onHookError={onError}
      />,
    );

    await act(async () => {
      await latestValue.loadEntries();
    });

    const entriesCall = apiRequest.mock.calls.find(
      ([url]) => url === "/entries?limit=60",
    );
    const tagsCall = apiRequest.mock.calls.find(([url]) => url === "/tags");

    expect(entriesCall?.[1]?.cache?.bypass).toBe(false);
    expect(entriesCall?.[1]?.cache?.staleOnError).toBe(true);
    expect(tagsCall?.[1]?.cache?.bypass).toBe(false);
    expect(tagsCall?.[1]?.cache?.staleOnError).toBe(true);
  });
});
