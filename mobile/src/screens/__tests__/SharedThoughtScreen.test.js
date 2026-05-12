import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SharedThoughtScreen from '../SharedThoughtScreen';
import { apiRequest } from '../../api';

jest.mock('../../api', () => ({
  apiRequest: jest.fn(),
}));

describe('SharedThoughtScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and renders shared thought details', async () => {
    apiRequest.mockResolvedValueOnce({
      thought: { text: 'A shared idea', created_at: '2026-01-02T03:04:00.000Z' },
      author: { username: 'jireh' },
    });

    const { getByPlaceholderText, getByText } = render(<SharedThoughtScreen />);

    fireEvent.changeText(getByPlaceholderText('share slug'), ' my-shared-slug ');
    fireEvent.press(getByText('Load thought'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/open-brain/shared-thought?slug=my-shared-slug',
        expect.objectContaining({
          cache: expect.objectContaining({ ttlMs: 30000 }),
        })
      );
      expect(getByText('A shared idea')).toBeTruthy();
      expect(getByText('by @jireh')).toBeTruthy();
    });
  });

  it('shows API error when loading fails', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Not found'));

    const { getByPlaceholderText, getByText, findByText } = render(<SharedThoughtScreen />);

    fireEvent.changeText(getByPlaceholderText('share slug'), 'missing');
    fireEvent.press(getByText('Load thought'));

    expect(await findByText('Not found')).toBeTruthy();
  });

  it('does not load when slug is empty or whitespace', () => {
    const { getByText, getByPlaceholderText } = render(<SharedThoughtScreen />);

    fireEvent.press(getByText('Load thought'));
    fireEvent.changeText(getByPlaceholderText('share slug'), '   ');
    fireEvent.press(getByText('Load thought'));

    expect(apiRequest).not.toHaveBeenCalled();
  });
});
