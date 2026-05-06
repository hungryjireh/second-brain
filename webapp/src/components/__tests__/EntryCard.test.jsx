import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntryCard from '../EntryCard.jsx';

function makeEntry(overrides = {}) {
  return {
    id: 42,
    category: 'todo',
    priority: 7,
    title: 'Ship tests',
    summary: 'Write behavior checks',
    content: 'Write behavior checks',
    created_at: 1_710_000_000,
    is_archived: false,
    ...overrides,
  };
}

describe('EntryCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('opens description when card body is clicked', async () => {
    const user = userEvent.setup();
    const onOpenDescription = vi.fn();
    const entry = makeEntry();

    render(
      <EntryCard
        entry={entry}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
        onEdit={vi.fn()}
        onOpenDescription={onOpenDescription}
        authToken="token"
      />
    );

    await user.click(screen.getByText('Ship tests'));
    expect(onOpenDescription).toHaveBeenCalledWith(entry);
  });

  it('calls onEdit when Edit is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const entry = makeEntry();

    render(
      <EntryCard
        entry={entry}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
        onEdit={onEdit}
        onOpenDescription={vi.fn()}
        authToken="token"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  it('archives an entry and emits updated item', async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    const entry = makeEntry();
    const updatedEntry = { ...entry, is_archived: true };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedEntry,
    });

    render(
      <EntryCard
        entry={entry}
        onDelete={vi.fn()}
        onArchive={onArchive}
        onEdit={vi.fn()}
        onOpenDescription={vi.fn()}
        authToken="token"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Archive' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/entries?id=42', expect.objectContaining({
        method: 'PATCH',
      }));
      expect(onArchive).toHaveBeenCalledWith(updatedEntry);
    });
  });

  it('requires delete confirmation before firing API call', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const entry = makeEntry();

    fetch.mockResolvedValueOnce({ ok: true });

    render(
      <EntryCard
        entry={entry}
        onDelete={onDelete}
        onArchive={vi.fn()}
        onEdit={vi.fn()}
        onOpenDescription={vi.fn()}
        authToken="token"
      />
    );

    await user.click(screen.getByTitle('Delete'));
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByTitle('Click again to confirm'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/entries?id=42', expect.objectContaining({
        method: 'DELETE',
      }));
      expect(onDelete).toHaveBeenCalledWith(42);
    });
  });

  it('opens mobile actions and triggers edit', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const entry = makeEntry();

    render(
      <EntryCard
        entry={entry}
        onDelete={vi.fn()}
        onArchive={vi.fn()}
        onEdit={onEdit}
        onOpenDescription={vi.fn()}
        authToken="token"
        isMobile
      />
    );

    await user.click(screen.getByRole('button', { name: '▾' }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  it('archives from mobile actions menu', async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    const entry = makeEntry();
    const updatedEntry = { ...entry, is_archived: true };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedEntry,
    });

    render(
      <EntryCard
        entry={entry}
        onDelete={vi.fn()}
        onArchive={onArchive}
        onEdit={vi.fn()}
        onOpenDescription={vi.fn()}
        authToken="token"
        isMobile
      />
    );

    await user.click(screen.getByRole('button', { name: '▾' }));
    await user.click(screen.getByRole('button', { name: 'Archive' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/entries?id=42', expect.objectContaining({
        method: 'PATCH',
      }));
      expect(onArchive).toHaveBeenCalledWith(updatedEntry);
    });
  });
});
