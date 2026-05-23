import { act, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SecondBrainQueuedEditsScreen from "../SecondBrainQueuedEditsScreen";

const mockQueuedPanel = jest.fn(() => null);

jest.mock("../../components/SecondBrainQueuedEntriesPanel", () => {
  return function MockSecondBrainQueuedEntriesPanel(props) {
    mockQueuedPanel(props);
    return null;
  };
});

describe("SecondBrainQueuedEditsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows empty state when there are no queued entries", async () => {
    jest
      .spyOn(AsyncStorage, "getItem")
      .mockResolvedValueOnce(
        JSON.stringify({ version: 1, entries: [], userTags: [], queue: [] }),
      );

    const { getByText } = render(
      <SecondBrainQueuedEditsScreen token="token" />,
    );

    await waitFor(() => {
      expect(getByText("No queued changes to edit.")).toBeTruthy();
    });
  });

  it("loads queue and passes mapped entries to panel", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockResolvedValueOnce(
      JSON.stringify({
        version: 1,
        entries: [],
        userTags: [],
        queue: [
          {
            type: "create",
            description: "Queued draft",
            queue_id: "q-1",
          },
          {
            type: "delete",
            id: 9,
            queue_id: "q-2",
          },
        ],
      }),
    );

    render(<SecondBrainQueuedEditsScreen token="token" />);

    await waitFor(() => {
      expect(mockQueuedPanel).toHaveBeenCalled();
    });

    const latestProps = mockQueuedPanel.mock.calls.at(-1)[0];
    expect(latestProps.queuedEntries).toEqual([
      expect.objectContaining({
        queueId: "q-1",
        type: "create",
        editable: true,
      }),
      expect.objectContaining({
        queueId: "q-2",
        type: "delete",
        editable: false,
      }),
    ]);
  });

  it("saves queued create edits back to storage", async () => {
    const snapshot = {
      version: 1,
      entries: [],
      userTags: [],
      queue: [
        {
          type: "create",
          description: "Queued draft",
          queue_id: "q-1",
        },
      ],
    };

    jest
      .spyOn(AsyncStorage, "getItem")
      .mockResolvedValue(JSON.stringify(snapshot));
    const setItemSpy = jest
      .spyOn(AsyncStorage, "setItem")
      .mockResolvedValue(undefined);

    render(<SecondBrainQueuedEditsScreen token="token" />);

    await waitFor(() => {
      expect(mockQueuedPanel).toHaveBeenCalled();
    });

    const latestProps = mockQueuedPanel.mock.calls.at(-1)[0];
    let result;
    await act(async () => {
      result = await latestProps.onSaveQueuedEntry({
        queueId: "q-1",
        description: "Updated queued draft",
      });
    });

    expect(result).toEqual({ ok: true });
    expect(setItemSpy).toHaveBeenCalledWith(
      "secondBrainOffline:token",
      expect.stringContaining("Updated queued draft"),
    );
  });

  it("deletes queued entries from storage", async () => {
    const snapshot = {
      version: 1,
      entries: [],
      userTags: [],
      queue: [
        {
          type: "create",
          description: "Queued draft",
          queue_id: "q-1",
        },
        {
          type: "delete",
          id: 9,
          queue_id: "q-2",
        },
      ],
    };

    jest
      .spyOn(AsyncStorage, "getItem")
      .mockResolvedValue(JSON.stringify(snapshot));
    const setItemSpy = jest
      .spyOn(AsyncStorage, "setItem")
      .mockResolvedValue(undefined);

    render(<SecondBrainQueuedEditsScreen token="token" />);

    await waitFor(() => {
      expect(mockQueuedPanel).toHaveBeenCalled();
    });

    const latestProps = mockQueuedPanel.mock.calls.at(-1)[0];
    let result;
    await act(async () => {
      result = await latestProps.onDeleteQueuedEntry("q-1");
    });

    expect(result).toEqual({ ok: true });
    expect(setItemSpy).toHaveBeenCalledWith(
      "secondBrainOffline:token",
      expect.not.stringContaining('"queue_id":"q-1"'),
    );
  });

  it("deletes legacy queued entries that do not have queue_id", async () => {
    const snapshot = {
      version: 1,
      entries: [],
      userTags: [],
      queue: [
        {
          type: "delete",
          id: 9,
        },
        {
          type: "create",
          description: "Queued draft",
          queue_id: "q-2",
        },
      ],
    };

    jest
      .spyOn(AsyncStorage, "getItem")
      .mockResolvedValue(JSON.stringify(snapshot));
    const setItemSpy = jest
      .spyOn(AsyncStorage, "setItem")
      .mockResolvedValue(undefined);

    render(<SecondBrainQueuedEditsScreen token="token" />);

    await waitFor(() => {
      expect(mockQueuedPanel).toHaveBeenCalled();
    });

    const latestProps = mockQueuedPanel.mock.calls.at(-1)[0];
    let result;
    await act(async () => {
      result = await latestProps.onDeleteQueuedEntry("queued-1");
    });

    expect(result).toEqual({ ok: true });
    expect(setItemSpy).toHaveBeenCalledWith(
      "secondBrainOffline:token",
      expect.not.stringContaining('"id":9'),
    );
  });

  it("removes deleted queued entry from rendered queued list", async () => {
    const snapshot = {
      version: 1,
      entries: [],
      userTags: [],
      queue: [
        {
          type: "create",
          description: "Queued draft one",
          queue_id: "q-1",
        },
        {
          type: "create",
          description: "Queued draft two",
          queue_id: "q-2",
        },
      ],
    };

    jest
      .spyOn(AsyncStorage, "getItem")
      .mockResolvedValue(JSON.stringify(snapshot));
    jest.spyOn(AsyncStorage, "setItem").mockResolvedValue(undefined);

    render(<SecondBrainQueuedEditsScreen token="token" />);

    await waitFor(() => {
      expect(mockQueuedPanel).toHaveBeenCalled();
    });

    const initialProps = mockQueuedPanel.mock.calls.at(-1)[0];
    expect(initialProps.queuedEntries).toHaveLength(2);

    let result;
    await act(async () => {
      result = await initialProps.onDeleteQueuedEntry("q-1");
    });
    expect(result).toEqual({ ok: true });

    await waitFor(() => {
      const latestProps = mockQueuedPanel.mock.calls.at(-1)[0];
      expect(latestProps.queuedEntries).toHaveLength(1);
      expect(latestProps.queuedEntries[0].queueId).toBe("q-2");
    });
  });
});
