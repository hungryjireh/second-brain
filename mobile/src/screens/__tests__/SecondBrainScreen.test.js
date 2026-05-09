import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SecondBrainScreen from '../SecondBrainScreen';
import { apiRequest } from '../../api';

jest.mock('../../api', () => ({
  apiRequest: jest.fn(),
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

    const { getByText, queryByText } = render(<SecondBrainScreen token={token} />);

    await waitFor(() => expect(getByText('Ship tests')).toBeTruthy());
    fireEvent.press(getByText('Archive'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/entries?id=42', expect.objectContaining({ method: 'PATCH' }));
    });

    await waitFor(() => {
      expect(queryByText('Ship tests')).toBeNull();
    });
  });

  it('requires delete confirmation before deleting an entry', async () => {
    const entry = { id: 42, title: 'Ship tests', summary: 'Write behavior checks', is_archived: false };

    apiRequest
      .mockResolvedValueOnce({ entries: [entry] })
      .mockResolvedValueOnce({});

    const { getByText, queryByText } = render(<SecondBrainScreen token={token} />);

    await waitFor(() => expect(getByText('Ship tests')).toBeTruthy());
    fireEvent.press(getByText('×'));
    expect(queryByText('!')).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalledWith('/entries?id=42', expect.objectContaining({ method: 'DELETE' }));

    fireEvent.press(getByText('!'));

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

    const { getByText, getByDisplayValue, getByPlaceholderText } = render(<SecondBrainScreen token={token} />);

    await waitFor(() => expect(getByText('Ship tests')).toBeTruthy());
    fireEvent.press(getByText('Edit'));

    expect(getByDisplayValue('Write behavior checks')).toBeTruthy();
    fireEvent.changeText(getByPlaceholderText('Description'), 'Updated text');
    fireEvent.press(getByText('Save changes'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/entries?id=42', expect.objectContaining({ method: 'PATCH' }));
      expect(getByText('Updated text')).toBeTruthy();
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

    const { getByText, queryByText } = render(<SecondBrainScreen token={token} />);

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
});
