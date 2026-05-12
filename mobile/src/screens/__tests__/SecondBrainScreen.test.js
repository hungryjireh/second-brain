import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SecondBrainScreen from '../SecondBrainScreen';
import { apiRequest } from '../../api';

jest.mock('../../api', () => ({
  apiRequest: jest.fn(),
  getApiBase: jest.fn(() => 'http://localhost:3000/api'),
}));

describe('SecondBrainScreen', () => {
  const token = 'token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('archives an entry and updates button label', async () => {
    const entry = { id: 42, title: 'Ship tests', summary: 'Write behavior checks', is_archived: false };
    const archived = { ...entry, is_archived: true };

    apiRequest
      .mockResolvedValueOnce({ entries: [entry] })
      .mockResolvedValueOnce(archived);

    const { getByText } = render(<SecondBrainScreen token={token} />);

    await waitFor(() => expect(getByText('Ship tests')).toBeTruthy());
    fireEvent.press(getByText('Archive'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/entries?id=42', expect.objectContaining({ method: 'PATCH' }));
    });

    await waitFor(() => {
      expect(() => getByText('Ship tests')).toThrow();
    });
  });

  it('requires delete confirmation before deleting an entry', async () => {
    const entry = { id: 42, title: 'Ship tests', summary: 'Write behavior checks', is_archived: false };

    apiRequest
      .mockResolvedValueOnce({ entries: [entry] })
      .mockResolvedValueOnce({});

    const { getByText, queryByText, getByTestId } = render(<SecondBrainScreen token={token} />);

    await waitFor(() => expect(getByText('Ship tests')).toBeTruthy());
    fireEvent.press(getByTestId('entry-swipe-delete-42'));
    expect(queryByText('Confirm')).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalledWith('/entries?id=42', expect.objectContaining({ method: 'DELETE' }));

    fireEvent.press(getByTestId('entry-swipe-delete-42'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/entries?id=42', expect.objectContaining({ method: 'DELETE' }));
    });
  });

  it('opens edit panel and saves edited text', async () => {
    const entry = { id: 42, title: 'Ship tests', summary: 'Write behavior checks', raw_text: 'Write behavior checks', is_archived: false };
    const updated = { ...entry, summary: 'Updated text', raw_text: 'Updated text' };

    apiRequest
      .mockResolvedValueOnce({ entries: [entry] })
      .mockResolvedValueOnce(updated);

    const { getByText, getAllByDisplayValue, getByPlaceholderText } = render(<SecondBrainScreen token={token} />);

    await waitFor(() => expect(getByText('Ship tests')).toBeTruthy());
    fireEvent.press(getByText('Edit'));

    expect(getAllByDisplayValue('Write behavior checks').length).toBeGreaterThan(0);
    fireEvent.changeText(getByPlaceholderText('Description'), 'Updated text');
    fireEvent.press(getByText('Save changes'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/entries?id=42', expect.objectContaining({ method: 'PATCH' }));
    });
  });

  it('opens entry detail view on card press and closes it', async () => {
    const entry = {
      id: 42,
      title: 'Ship tests',
      summary: 'Write behavior checks',
      raw_text: 'Full detail content',
      is_archived: false,
    };

    apiRequest.mockResolvedValueOnce({ entries: [entry] });

    const { getByText, getAllByText, queryByText, getByTestId } = render(<SecondBrainScreen token={token} />);

    await waitFor(() => expect(getByText('Ship tests')).toBeTruthy());
    fireEvent.press(getByText('Ship tests'));

    expect(getByText('Full detail content')).toBeTruthy();
    fireEvent.press(getByText('Close'));
    expect(queryByText('Close')).toBeNull();
  });

  it('renders imported LLM conversations with speaker labels in entry detail', async () => {
    const entry = {
      id: 77,
      title: 'Claude thread',
      summary: 'Imported',
      raw_text: JSON.stringify({
        _format: 'chat_conversation_v1',
        source: 'claude',
        messages: [
          { sender: 'human', text: 'Please summarize **this**' },
          { sender: 'assistant', text: 'Here is a summary.' },
        ],
      }),
      is_archived: false,
    };

    apiRequest.mockResolvedValueOnce({ entries: [entry] });

    const { getByText } = render(<SecondBrainScreen token={token} />);

    await waitFor(() => expect(getByText('Claude thread')).toBeTruthy());
    fireEvent.press(getByText('Claude thread'));

    expect(getByText('You')).toBeTruthy();
    expect(getByText('Assistant')).toBeTruthy();
    expect(getByText('Please summarize ')).toBeTruthy();
    expect(getByText('this')).toBeTruthy();
    expect(getByText('Here is a summary.')).toBeTruthy();
  });

  it('creates an entry from composer input and reloads list', async () => {
    const created = {
      id: 100,
      title: 'New note',
      summary: 'created from composer',
      is_archived: false,
      category: 'note',
      created_at: Math.floor(Date.now() / 1000),
    };

    apiRequest.mockImplementation(async (url, options = {}) => {
      if (url === '/entries?limit=60') {
        if (options.method === 'POST') return {};
        return { entries: created.id ? [created] : [] };
      }
      if (url === '/settings') return {};
      if (url === '/entries') return {};
      return {};
    });

    const { getByPlaceholderText, getByText } = render(<SecondBrainScreen token={token} />);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/entries?limit=60', expect.objectContaining({ token }));
    });

    fireEvent.changeText(getByPlaceholderText('Type a note, reminder or thought...'), '  created from composer  ');
    fireEvent.press(getByText('↗'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/entries', {
        method: 'POST',
        token,
        body: { description: 'created from composer' },
      });
      expect(getByText('created from composer')).toBeTruthy();
    });
  });

  it('filters entries by selected tag and toggles off on second press', async () => {
    const entries = [
      { id: 1, title: 'Work item', summary: 'for work', is_archived: false, category: 'note', tags: ['work'] },
      { id: 2, title: 'Home item', summary: 'for home', is_archived: false, category: 'note', tags: ['home'] },
    ];

    apiRequest.mockImplementation(async (url) => {
      if (url === '/entries?limit=60') return { entries };
      if (url === '/settings') return {};
      return {};
    });

    const { getByText, getAllByText, queryByText, getByTestId } = render(<SecondBrainScreen token={token} />);

    await waitFor(() => expect(getByText('Work item')).toBeTruthy());
    expect(getByText('Home item')).toBeTruthy();

    fireEvent.press(getByTestId('tag-filter-work'));
    expect(getAllByText('Work item').length).toBeGreaterThan(0);
    expect(queryByText('Home item')).toBeNull();

    fireEvent.press(getByTestId('tag-filter-work'));
    expect(getAllByText('Work item').length).toBeGreaterThan(0);
    expect(getByText('Home item')).toBeTruthy();
  });

  it('shows validation error and skips PATCH when priority is out of range', async () => {
    const entry = {
      id: 42,
      title: 'Ship tests',
      summary: 'Write behavior checks',
      raw_text: 'Write behavior checks',
      is_archived: false,
      priority: 5,
      category: 'note',
    };

    apiRequest.mockImplementation(async (url) => {
      if (url === '/entries?limit=60') return { entries: [entry] };
      if (url === '/settings') return {};
      return {};
    });

    const { getByText, getAllByDisplayValue, getByPlaceholderText, findByText } = render(<SecondBrainScreen token={token} />);

    await waitFor(() => expect(getByText('Ship tests')).toBeTruthy());
    fireEvent.press(getByText('Edit'));
    expect(getAllByDisplayValue('Write behavior checks').length).toBeGreaterThan(0);

    fireEvent.changeText(getByPlaceholderText('0'), '11');
    fireEvent.press(getByText('Save changes'));

    expect(await findByText('Priority must be an integer from 0 to 10.')).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalledWith(
      '/entries?id=42',
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
