import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SecondBrainEntryDetailsScreen from '../SecondBrainEntryDetailsScreen';
import { apiRequest } from '../../api';

jest.mock('../../api', () => ({
  apiRequest: jest.fn(),
}));

describe('SecondBrainEntryDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders entry details content', () => {
    const entry = {
      id: 42,
      title: 'Ship tests',
      summary: 'Write behavior checks',
      raw_text: 'Full detail content',
      tags: ['work'],
    };

    const { getByText } = render(<SecondBrainEntryDetailsScreen route={{ params: { entry } }} />);

    expect(getByText('Ship tests')).toBeTruthy();
    expect(getByText('Write behavior checks')).toBeTruthy();
    expect(getByText('Full detail content')).toBeTruthy();
    expect(getByText('#work')).toBeTruthy();
  });

  it('goes back when navigation can go back', () => {
    const canGoBack = jest.fn(() => true);
    const goBack = jest.fn();
    const navigate = jest.fn();

    const { getByLabelText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entry: { title: 'Entry' } } }}
        navigation={{ canGoBack, goBack, navigate }}
      />
    );

    fireEvent.press(getByLabelText('Back to Second Brain'));

    expect(canGoBack).toHaveBeenCalled();
    expect(goBack).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates to SecondBrain when navigation cannot go back', () => {
    const canGoBack = jest.fn(() => false);
    const goBack = jest.fn();
    const navigate = jest.fn();

    const { getByLabelText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entry: { title: 'Entry' } } }}
        navigation={{ canGoBack, goBack, navigate }}
      />
    );

    fireEvent.press(getByLabelText('Back to Second Brain'));

    expect(canGoBack).toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('SecondBrain');
  });

  it('renders imported conversation messages when entry is a chat conversation payload', () => {
    const entry = {
      title: 'Claude thread',
      raw_text: JSON.stringify({
        _format: 'chat_conversation_v1',
        messages: [
          { sender: 'human', text: 'Please summarize this' },
          { sender: 'assistant', text: 'Here is a summary.' },
        ],
      }),
    };

    const { getByText } = render(<SecondBrainEntryDetailsScreen route={{ params: { entry } }} />);

    expect(getByText('You')).toBeTruthy();
    expect(getByText('Assistant')).toBeTruthy();
    expect(getByText('Please summarize this')).toBeTruthy();
    expect(getByText('Here is a summary.')).toBeTruthy();
  });

  it('falls back to raw body rendering when imported conversation JSON is invalid', () => {
    const entry = {
      title: 'Broken import',
      raw_text: '{not-valid-json',
    };

    const { getByText, queryByText } = render(<SecondBrainEntryDetailsScreen route={{ params: { entry } }} />);

    expect(getByText('{not-valid-json')).toBeTruthy();
    expect(queryByText('You')).toBeNull();
    expect(queryByText('Assistant')).toBeNull();
  });

  it('navigates to edit entry screen when Edit is pressed', () => {
    const navigate = jest.fn();
    const entry = { id: 7, title: 'Entry' };
    const { getByLabelText, getByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} navigation={{ navigate }} />
    );

    fireEvent.press(getByLabelText('Open entry actions'));
    fireEvent.press(getByText('Edit'));

    expect(navigate).toHaveBeenCalledWith('SecondBrainEditEntry', {
      entryId: 7,
      entry: { id: 7, title: 'Entry' },
    });
  });

  it('replaces with edit entry screen when replace is available', () => {
    const navigate = jest.fn();
    const replace = jest.fn();
    const entry = { id: 9, title: 'Entry 9' };
    const { getByLabelText, getByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} navigation={{ navigate, replace }} />
    );

    fireEvent.press(getByLabelText('Open entry actions'));
    fireEvent.press(getByText('Edit'));

    expect(replace).toHaveBeenCalledWith('SecondBrainEditEntry', {
      entryId: 9,
      entry: { id: 9, title: 'Entry 9' },
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('loads entry by route entryId and renders fetched title', async () => {
    apiRequest.mockResolvedValueOnce({
      entries: [
        { id: 10, title: 'Other entry' },
        { id: 42, title: 'Loaded entry title', summary: 'Loaded summary', raw_text: 'Loaded body' },
      ],
    });

    const { getByText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entryId: 42 } }}
        token="token"
      />
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/entries?limit=60', { token: 'token' });
      expect(getByText('Loaded entry title')).toBeTruthy();
    });
  });

  it('renders clicked entry title immediately while entryId fetch is still pending', () => {
    const entry = {
      id: 42,
      title: 'Clicked entry title',
      summary: 'Clicked summary',
      raw_text: 'Clicked body',
    };

    apiRequest.mockImplementation(() => new Promise(() => {}));

    const { getByText, queryByText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entryId: 42, entry } }}
        token="token"
      />
    );

    expect(getByText('Clicked entry title')).toBeTruthy();
    expect(queryByText('Untitled')).toBeNull();
  });
});
