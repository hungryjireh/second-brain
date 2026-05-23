import { act, fireEvent, render } from "@testing-library/react-native";
import SecondBrainQueuedEntriesPanel from "../SecondBrainQueuedEntriesPanel";

const mockCard = jest.fn(() => null);

jest.mock("../SecondBrainEntryCard", () => {
  return function MockSecondBrainEntryCard(props) {
    mockCard(props);
    return null;
  };
});

const styles = {
  queuedEntriesList: {},
  queuedEntryCard: {},
  queuedEntryCardCompact: {},
  queuedEntryType: {},
  queuedEntrySummary: {},
  queuedEntryMeta: {},
  queuedEntryInput: {},
  queuedEntryError: {},
  queuedEntryActionsRow: {},
  queuedEntryButton: {},
  queuedEntryButtonText: {},
};

describe("SecondBrainQueuedEntriesPanel", () => {
  beforeEach(() => {
    mockCard.mockClear();
  });

  it("renders queued create and queued delete with entry card style", () => {
    const { getByTestId } = render(
      <SecondBrainQueuedEntriesPanel
        styles={styles}
        queuedEntries={[
          {
            queueId: "q-create",
            type: "create",
            summary: "Create note",
            description: "Create note",
            editable: true,
          },
          {
            queueId: "q-delete",
            type: "delete",
            summary: "Delete entry 99",
            description: "",
            editable: false,
          },
        ]}
        savingQueueEntryId=""
        queueError=""
        onSaveQueuedEntry={jest.fn(async () => ({ ok: true }))}
        onDeleteQueuedEntry={jest.fn(async () => ({ ok: true }))}
      />,
    );

    expect(mockCard).toHaveBeenCalledTimes(2);
    const first = mockCard.mock.calls[0][0];
    const second = mockCard.mock.calls[1][0];
    expect(first.entry.id).toBe("q-create");
    expect(second.entry.id).toBe("q-delete");
    expect(first.hidePriority).toBe(true);
    expect(first.hideMenuButton).toBe(true);
    expect(second.hidePriority).toBe(true);
    expect(second.hideMenuButton).toBe(true);
    expect(getByTestId("entry-swipe-card-q-create")).toBeTruthy();
    expect(getByTestId("entry-swipe-card-q-delete")).toBeTruthy();
  });

  it("does not render duplicate legacy delete text for queued delete entries", () => {
    const { queryByText } = render(
      <SecondBrainQueuedEntriesPanel
        styles={styles}
        queuedEntries={[
          {
            queueId: "q-delete",
            type: "delete",
            summary: "Delete entry 99",
            description: "",
            editable: false,
          },
        ]}
        savingQueueEntryId=""
        queueError=""
        onSaveQueuedEntry={jest.fn(async () => ({ ok: true }))}
        onDeleteQueuedEntry={jest.fn(async () => ({ ok: true }))}
      />,
    );

    expect(queryByText("Queue item 1")).toBeNull();
    expect(queryByText("Delete entry 99")).toBeNull();
  });

  it("supports editing and saving queued create entries", async () => {
    const onSaveQueuedEntry = jest.fn(async () => ({ ok: true }));

    const { getByTestId } = render(
      <SecondBrainQueuedEntriesPanel
        styles={styles}
        queuedEntries={[
          {
            queueId: "q-create",
            type: "create",
            summary: "Create note",
            description: "Create note",
            editable: true,
          },
        ]}
        savingQueueEntryId=""
        queueError=""
        onSaveQueuedEntry={onSaveQueuedEntry}
        onDeleteQueuedEntry={jest.fn(async () => ({ ok: true }))}
      />,
    );

    const startEdit = mockCard.mock.calls[0][0].onStartEdit;
    await act(async () => {
      startEdit();
    });

    fireEvent.changeText(getByTestId("queued-edit-input-q-create"), "Updated");
    await act(async () => {
      fireEvent.press(getByTestId("queued-save-button-q-create"));
    });

    expect(onSaveQueuedEntry).toHaveBeenCalledWith({
      queueId: "q-create",
      description: "Updated",
    });
  });

  it("shows validation error when saving an empty queued create description", async () => {
    const onSaveQueuedEntry = jest.fn(async () => ({ ok: true }));

    const { getByTestId, getByText } = render(
      <SecondBrainQueuedEntriesPanel
        styles={styles}
        queuedEntries={[
          {
            queueId: "q-create",
            type: "create",
            summary: "Create note",
            description: "Create note",
            editable: true,
          },
        ]}
        savingQueueEntryId=""
        queueError=""
        onSaveQueuedEntry={onSaveQueuedEntry}
        onDeleteQueuedEntry={jest.fn(async () => ({ ok: true }))}
      />,
    );

    const startEdit = mockCard.mock.calls[0][0].onStartEdit;
    await act(async () => {
      startEdit();
    });

    fireEvent.changeText(getByTestId("queued-edit-input-q-create"), "   ");
    await act(async () => {
      fireEvent.press(getByTestId("queued-save-button-q-create"));
    });

    expect(onSaveQueuedEntry).not.toHaveBeenCalled();
    expect(getByText("Description is required.")).toBeTruthy();
  });

  it("clears editing state on cancel", async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <SecondBrainQueuedEntriesPanel
        styles={styles}
        queuedEntries={[
          {
            queueId: "q-create",
            type: "create",
            summary: "Create note",
            description: "Create note",
            editable: true,
          },
        ]}
        savingQueueEntryId=""
        queueError=""
        onSaveQueuedEntry={jest.fn(async () => ({ ok: true }))}
        onDeleteQueuedEntry={jest.fn(async () => ({ ok: true }))}
      />,
    );

    const startEdit = mockCard.mock.calls[0][0].onStartEdit;
    await act(async () => {
      startEdit();
    });

    fireEvent.changeText(getByTestId("queued-edit-input-q-create"), "   ");
    await act(async () => {
      fireEvent.press(getByTestId("queued-save-button-q-create"));
    });
    expect(getByText("Description is required.")).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText("Cancel"));
    });
    expect(queryByTestId("queued-edit-input-q-create")).toBeNull();
    expect(queryByTestId("queued-save-button-q-create")).toBeNull();
  });

  it("re-renders only the edited row after starting edit in a multi-row list", async () => {
    render(
      <SecondBrainQueuedEntriesPanel
        styles={styles}
        queuedEntries={[
          {
            queueId: "q-create-1",
            type: "create",
            summary: "Create note 1",
            description: "Create note 1",
            editable: true,
          },
          {
            queueId: "q-create-2",
            type: "create",
            summary: "Create note 2",
            description: "Create note 2",
            editable: true,
          },
        ]}
        savingQueueEntryId=""
        queueError=""
        onSaveQueuedEntry={jest.fn(async () => ({ ok: true }))}
        onDeleteQueuedEntry={jest.fn(async () => ({ ok: true }))}
      />,
    );

    expect(mockCard).toHaveBeenCalledTimes(2);

    const startEditFirstRow = mockCard.mock.calls[0][0].onStartEdit;
    await act(async () => {
      startEditFirstRow();
    });

    expect(mockCard).toHaveBeenCalledTimes(3);
  });

  it("deletes a queued entry from swipe action", async () => {
    const onDeleteQueuedEntry = jest.fn(async () => ({ ok: true }));
    const { getByTestId } = render(
      <SecondBrainQueuedEntriesPanel
        styles={styles}
        queuedEntries={[
          {
            queueId: "q-delete",
            type: "delete",
            summary: "Delete entry 99",
            description: "",
            editable: false,
          },
        ]}
        savingQueueEntryId=""
        queueError=""
        onSaveQueuedEntry={jest.fn(async () => ({ ok: true }))}
        onDeleteQueuedEntry={onDeleteQueuedEntry}
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId("entry-swipe-delete-q-delete"));
    });

    expect(onDeleteQueuedEntry).toHaveBeenCalledWith("q-delete");
  });
});
