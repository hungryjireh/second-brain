import { fireEvent, render, waitFor } from '@testing-library/react-native';
import fs from 'node:fs';
import path from 'node:path';
import SecondBrainScreen from '../SecondBrainScreen';
import { apiRequest } from '../../api';

jest.mock('../../api', () => ({
  apiRequest: jest.fn(),
  buildApiUrl: jest.fn((path) => `http://localhost:3000/api${path}`),
  createAuthHeaders: jest.fn((token) => (token ? { Authorization: `Bearer ${token}` } : undefined)),
}));

describe('SecondBrainScreen', () => {
  const token = 'token';
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('archives an entry and updates button label', async () => {
    const entry = { id: 42, title: 'Ship tests', summary: 'Write behavior checks', is_archived: false };
    const archived = { ...entry, is_archived: true };

    apiRequest
      .mockResolvedValueOnce({ entries: [entry] })
      .mockResolvedValueOnce(archived);

    const { getByText } = render(<SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />);

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

    const { getByText, queryByText, getByTestId } = render(<SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => expect(getByText('Ship tests')).toBeTruthy());
    fireEvent.press(getByTestId('entry-swipe-delete-42'));
    expect(queryByText('Confirm')).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalledWith('/entries?id=42', expect.objectContaining({ method: 'DELETE' }));

    fireEvent.press(getByTestId('entry-swipe-delete-42'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/entries?id=42', expect.objectContaining({ method: 'DELETE' }));
    });
  });

  it('navigates to entry edit screen on edit action', async () => {
    const entry = { id: 42, title: 'Ship tests', summary: 'Write behavior checks', raw_text: 'Write behavior checks', is_archived: false };
    apiRequest.mockResolvedValueOnce({ entries: [entry] });
    const navigate = jest.fn();

    const { getByText } = render(<SecondBrainScreen token={token} navigation={{ navigate }} />);
    await waitFor(() => expect(getByText('Ship tests')).toBeTruthy());

    fireEvent.press(getByText('Edit'));

    expect(navigate).toHaveBeenCalledWith('SecondBrainEditEntry', expect.objectContaining({
      entry,
      token,
    }));
  });

  it('navigates to entry detail screen on card press', async () => {
    const entry = {
      id: 42,
      title: 'Ship tests',
      summary: 'Write behavior checks',
      raw_text: 'Full detail content',
      is_archived: false,
    };

    apiRequest.mockResolvedValueOnce({ entries: [entry] });
    const navigate = jest.fn();

    const { getByText } = render(<SecondBrainScreen token={token} navigation={{ navigate }} />);

    await waitFor(() => expect(getByText('Ship tests')).toBeTruthy());
    fireEvent.press(getByText('Ship tests'));

    expect(navigate).toHaveBeenCalledWith('SecondBrainEntryDetails', { entry, token });
  });

  it('navigates to entry detail screen for imported LLM conversations', async () => {
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
    const navigate = jest.fn();

    const { getByText } = render(<SecondBrainScreen token={token} navigation={{ navigate }} />);

    await waitFor(() => expect(getByText('Claude thread')).toBeTruthy());
    fireEvent.press(getByText('Claude thread'));

    expect(navigate).toHaveBeenCalledWith('SecondBrainEntryDetails', { entry, token });
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

    const { getByPlaceholderText, getByText, getByLabelText } = render(<SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/entries?limit=60', expect.objectContaining({ token }));
    });

    fireEvent.changeText(getByPlaceholderText('Type a note, reminder or thought...'), '  created from composer  ');
    fireEvent.press(getByLabelText('Enter note'));

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

    const { getByText, getAllByText, queryByText, getByTestId } = render(<SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => expect(getByText('Work item')).toBeTruthy());
    expect(getByText('Home item')).toBeTruthy();

    fireEvent.press(getByTestId('tag-filter-work'));
    expect(getAllByText('Work item').length).toBeGreaterThan(0);
    expect(queryByText('Home item')).toBeNull();

    fireEvent.press(getByTestId('tag-filter-work'));
    expect(getAllByText('Work item').length).toBeGreaterThan(0);
    expect(getByText('Home item')).toBeTruthy();
  });

  it('filters entries by search input', async () => {
    const entries = [
      { id: 1, title: 'Budget planning', summary: 'Q3 spreadsheet', raw_text: 'Forecast and allocation', is_archived: false, category: 'note', tags: ['finance'] },
      { id: 2, title: 'Workout plan', summary: 'Leg day', raw_text: 'Squats and lunges', is_archived: false, category: 'note', tags: ['health'] },
    ];

    apiRequest.mockImplementation(async (url) => {
      if (url === '/entries?limit=60') return { entries };
      if (url === '/settings') return {};
      return {};
    });

    const { getByText, queryByText, getByPlaceholderText } = render(<SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => expect(getByText('Budget planning')).toBeTruthy());
    expect(getByText('Workout plan')).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText('Search entries...'), 'budget');
    expect(getByText('Budget planning')).toBeTruthy();
    expect(queryByText('Workout plan')).toBeNull();

    fireEvent.changeText(getByPlaceholderText('Search entries...'), 'health');
    expect(queryByText('Budget planning')).toBeNull();
    expect(getByText('Workout plan')).toBeTruthy();
  });


  it('downloads .ics via absolute API base path', async () => {
    const reminderEntry = {
      id: 42,
      title: 'Doctor appointment',
      summary: 'Tomorrow 9am',
      raw_text: 'Bring documents',
      is_archived: false,
      category: 'reminder',
      remind_at: 1893459600,
    };

    apiRequest.mockImplementation(async (url) => {
      if (url === '/entries?limit=60') return { entries: [reminderEntry] };
      if (url === '/settings') return {};
      return {};
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('BEGIN:VCALENDAR\r\nEND:VCALENDAR'),
    });

    const { getByText } = render(<SecondBrainScreen token={token} navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => expect(getByText('Doctor appointment')).toBeTruthy());
    fireEvent.press(getByText('Add to Calendar'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [requestUrl, requestOptions] = global.fetch.mock.calls[0];
    expect(requestUrl).toBe('http://localhost:3000/api/ics?id=42');
    expect(requestOptions?.headers?.Authorization).toBe(`Bearer ${token}`);
  });

  it('uses the non-legacy expo filesystem File API for calendar export', () => {
    const screenPath = path.resolve(__dirname, '../SecondBrainScreen.js');
    const source = fs.readFileSync(screenPath, 'utf8');

    expect(source).toContain("import { File, Paths } from 'expo-file-system';");
    expect(source).toContain('const file = new File(Paths.cache, fileName);');
    expect(source).toContain('file.write(icsContent);');
    expect(source).not.toContain('writeAsStringAsync');
  });

});
