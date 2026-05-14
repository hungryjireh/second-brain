import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SharedThoughtScreen from '../SharedThoughtScreen';
import { apiRequest } from '../../api';
import { CACHE_TTL_MS } from '../../constants/cache';

jest.mock('../../api', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('../../constants/cache', () => ({
  CACHE_TTL_MS: {
    SHARED_THOUGHT: 30000,
  },
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
          cache: expect.objectContaining({ ttlMs: CACHE_TTL_MS.SHARED_THOUGHT }),
        })
      );
      expect(getByText('A shared idea')).toBeTruthy();
      expect(getByText('by')).toBeTruthy();
      expect(getByText('@jireh')).toBeTruthy();
    });
  });

  it('auto-loads when slug is provided in route params', async () => {
    apiRequest.mockResolvedValueOnce({
      thought: { text: 'URL shared idea', created_at: '2026-01-02T03:04:00.000Z' },
      author: { username: 'jireh' },
    });

    const { getByText, queryByPlaceholderText } = render(
      <SharedThoughtScreen route={{ params: { slug: 'from-url' } }} />
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/open-brain/shared-thought?slug=from-url',
        expect.objectContaining({
          cache: expect.objectContaining({ ttlMs: CACHE_TTL_MS.SHARED_THOUGHT }),
        })
      );
      expect(getByText('URL shared idea')).toBeTruthy();
      expect(getByText('by')).toBeTruthy();
      expect(getByText('@jireh')).toBeTruthy();
    });

    expect(queryByPlaceholderText('share slug')).toBeNull();
  });

  it('shows API error when loading fails', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Not found'));

    const { getByPlaceholderText, getByText, findByText } = render(<SharedThoughtScreen />);

    fireEvent.changeText(getByPlaceholderText('share slug'), 'missing');
    fireEvent.press(getByText('Load thought'));

    expect(await findByText('Not found')).toBeTruthy();
  });

  it('routes to Login when unauthenticated user taps username link', async () => {
    apiRequest.mockResolvedValueOnce({
      thought: { text: 'A shared idea', created_at: '2026-01-02T03:04:00.000Z' },
      author: { username: 'jireh' },
    });
    const navigation = { navigate: jest.fn() };
    const { getByText } = render(
      <SharedThoughtScreen route={{ params: { slug: 'my-shared-slug' } }} navigation={navigation} token={null} />
    );

    await waitFor(() => {
      expect(getByText('@jireh')).toBeTruthy();
    });

    fireEvent.press(getByText('@jireh'));
    expect(navigation.navigate).toHaveBeenCalledWith('Login');
  });

  it('does not load when slug is empty or whitespace', () => {
    const { getByText, getByPlaceholderText } = render(<SharedThoughtScreen />);

    fireEvent.press(getByText('Load thought'));
    fireEvent.changeText(getByPlaceholderText('share slug'), '   ');
    fireEvent.press(getByText('Load thought'));

    expect(apiRequest).not.toHaveBeenCalled();
  });
});
