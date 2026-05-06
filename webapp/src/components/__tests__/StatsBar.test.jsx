import { render, screen } from '@testing-library/react';
import StatsBar from '../StatsBar.jsx';

describe('StatsBar', () => {
  it('renders all category labels and provided counts', () => {
    render(
      <StatsBar
        counts={{ reminder: 2, todo: 3, thought: 1, note: 4 }}
      />
    );

    expect(screen.getByText('Reminders')).toBeInTheDocument();
    expect(screen.getByText('TODOs')).toBeInTheDocument();
    expect(screen.getByText('Thoughts')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('falls back to 0 when a count is missing', () => {
    render(<StatsBar counts={{ reminder: 5 }} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    const zeroNodes = screen.getAllByText('0');
    expect(zeroNodes).toHaveLength(3);
  });
});
