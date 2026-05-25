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
  const encodeSegment = (value) =>
    Buffer.from(value, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  const createTokenForUser = (userId) =>
    `header.${encodeSegment(JSON.stringify({ sub: userId }))}.signature`;

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
      expect(stored.queue).toHaveLength(1);
      expect(stored.queue[0]).toEqual(
        expect.objectContaining({
          type: "archive",
          id: 12,
          is_archived: true,
          queue_id: expect.any(String),
          queued_at: expect.any(Number),
        }),
      );
      expect(onError).toHaveBeenCalledWith(
        "Offline mode: changes will sync automatically.",
      );
    });
  });

  it("exposes queued entries and updates editable queued create entries", async () => {
    const storageKey = `secondBrainOffline:${token}`;
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        entries: [],
        userTags: [],
        queue: [
          {
            type: "create",
            description: "Original queued note",
            queue_id: "q-1",
            queued_at: 1,
          },
          {
            type: "archive",
            id: 55,
            is_archived: true,
            queue_id: "q-2",
            queued_at: 2,
          },
        ],
      }),
    );

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
      expect(latestValue.queuedEntries).toEqual([
        expect.objectContaining({
          queueId: "q-1",
          editable: true,
          summary: "Original queued note",
        }),
        expect.objectContaining({
          queueId: "q-2",
          editable: false,
          summary: "Archive entry 55",
        }),
      ]);
    });

    let result;
    await act(async () => {
      result = await latestValue.updateQueuedEntry({
        queueId: "q-1",
        description: "Updated queued note",
      });
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
      }),
    );

    const storedRaw = await AsyncStorage.getItem(storageKey);
    const stored = JSON.parse(storedRaw);
    expect(stored.queue[0]).toEqual(
      expect.objectContaining({
        queue_id: "q-1",
        description: "Updated queued note",
      }),
    );
  });

  it("rejects invalid queued entry updates with structured errors", async () => {
    const storageKey = `secondBrainOffline:${token}`;
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        entries: [],
        userTags: [],
        queue: [
          {
            type: "archive",
            id: 55,
            is_archived: true,
            queue_id: "q-2",
            queued_at: 2,
          },
        ],
      }),
    );

    render(
      <Harness
        authToken={token}
        onUpdate={(value) => {
          latestValue = value;
        }}
        onHookError={onError}
      />,
    );

    let invalidDescriptionResult;
    await act(async () => {
      invalidDescriptionResult = await latestValue.updateQueuedEntry({
        queueId: "q-2",
        description: "   ",
      });
    });
    expect(invalidDescriptionResult).toEqual({
      ok: false,
      error: {
        code: "invalid_description",
        field: "description",
        message: "Description is required.",
      },
    });

    let immutableResult;
    await act(async () => {
      immutableResult = await latestValue.updateQueuedEntry({
        queueId: "q-2",
        description: "Cannot edit archive",
      });
    });
    expect(immutableResult).toEqual({
      ok: false,
      error: {
        code: "immutable_entry",
        message: "Only queued create entries can be edited.",
      },
    });
  });

  it("retains queued offline actions across token rotation for the same user", async () => {
    const oldToken = createTokenForUser("user-123");
    const newToken = createTokenForUser("user-123");
    const legacyStorageKey = `secondBrainOffline:${oldToken}`;
    const stableStorageKey = "secondBrainOffline:user-123";

    await AsyncStorage.setItem(
      legacyStorageKey,
      JSON.stringify({
        version: 1,
        entries: [
          { id: 1001, description: "Queued cache entry", created_at: 1 },
        ],
        userTags: ["work"],
        queue: [
          {
            type: "create",
            description: "Queued while offline",
            queue_id: "q-retain-1",
            queued_at: 100,
          },
        ],
      }),
    );

    apiRequest.mockImplementation(async () => {
      throw new Error("Network down");
    });
    isLikelyOfflineError.mockReturnValue(true);

    render(
      <Harness
        authToken={newToken}
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
      expect(latestValue.offlineQueueSize).toBe(1);
      expect(latestValue.queuedEntries).toEqual([
        expect.objectContaining({
          queueId: "q-retain-1",
          summary: "Queued while offline",
        }),
      ]);
      expect(onError).toHaveBeenCalledWith(
        "Offline mode: showing saved entries.",
      );
    });

    await waitFor(async () => {
      const migrated = await AsyncStorage.getItem(stableStorageKey);
      const legacy = await AsyncStorage.getItem(legacyStorageKey);
      expect(migrated).toBeTruthy();
      expect(legacy).toBeNull();
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

  it("queues offline create without adding an optimistic entry to the feed", async () => {
    apiRequest.mockImplementation(async (url) => {
      if (url === "/entries?limit=60") {
        return {
          entries: [{ id: 10, created_at: 100, updated_at: 100 }],
        };
      }
      if (url === "/tags") return { tags: ["work"] };
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

    await act(async () => {
      await latestValue.applyOfflineCreateFallback("Queued while offline");
    });

    const storedRaw = await AsyncStorage.getItem(`secondBrainOffline:${token}`);
    const stored = JSON.parse(storedRaw);

    expect(latestValue.entries.map((item) => item.id)).toEqual([10]);
    expect(latestValue.offlineMode).toBe(true);
    expect(latestValue.offlineQueueSize).toBe(1);
    expect(latestValue.queuedEntries).toEqual([
      expect.objectContaining({
        type: "create",
        summary: "Queued while offline",
      }),
    ]);
    expect(stored.entries.map((item) => item.id)).toEqual([10]);
    expect(stored.queue).toEqual([
      expect.objectContaining({
        type: "create",
        description: "Queued while offline",
      }),
    ]);
    expect(onError).toHaveBeenCalledWith(
      "Offline mode: changes will sync automatically.",
    );
  });
});
