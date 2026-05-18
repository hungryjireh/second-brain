import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SecondBrainEditEntryScreen from '../SecondBrainEditEntryScreen';
import { apiRequest } from '../../api';

jest.mock('../../api', () => ({
  apiRequest: jest.fn(),
}));

describe('SecondBrainEditEntryScreen', () => {
  const token = 'token';
  const entry = {
    id: 42,
    title: 'Ship tests',
    summary: 'Write behavior checks',
    raw_text: 'Write behavior checks',
    category: 'note',
    priority: 3,
    tags: ['work'],
    is_archived: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves edited text and navigates to entry details', async () => {
    const navigate = jest.fn();
    apiRequest
      .mockResolvedValueOnce({ tags: ['work'] })
      .mockResolvedValueOnce({ ...entry, raw_text: 'Updated text', summary: 'Updated text' });

    const { getByPlaceholderText, getByText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token } }}
        navigation={{ navigate }}
      />
    );

    fireEvent.changeText(getByPlaceholderText('Description'), 'Updated text');
    fireEvent.press(getByText('Save changes'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/entries?id=42', expect.objectContaining({ method: 'PATCH' }));
    });
    expect(navigate).toHaveBeenCalledWith('SecondBrainEntryDetails', expect.objectContaining({
      entryId: 42,
      entry: expect.objectContaining({ id: 42 }),
    }));
  });

  it('shows validation error and skips PATCH when priority is out of range', async () => {
    const goBack = jest.fn();
    apiRequest.mockResolvedValueOnce({ tags: ['work'] });

    const { getByPlaceholderText, getByText, findByText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token } }}
        navigation={{ goBack }}
      />
    );

    fireEvent.changeText(getByPlaceholderText('0'), '11');
    fireEvent.press(getByText('Save changes'));

    expect(await findByText('Priority must be an integer from 0 to 10.')).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalledWith('/entries?id=42', expect.objectContaining({ method: 'PATCH' }));
    expect(goBack).not.toHaveBeenCalled();
  });

  it('disables description input and renders markdown preview when toggle is enabled', async () => {
    const goBack = jest.fn();
    apiRequest.mockResolvedValueOnce({ tags: ['work'] });
    const markdownEntry = {
      ...entry,
      raw_text: '**Bold** line',
    };

    const { getByTestId, getByText, queryByTestId } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: markdownEntry, token } }}
        navigation={{ goBack }}
      />
    );

    fireEvent(getByTestId('description-markdown-toggle'), 'valueChange', true);

    expect(queryByTestId('description-input')).toBeNull();
    expect(getByTestId('description-markdown-preview')).toBeTruthy();
    expect(getByText('Bold')).toBeTruthy();
  });
});
