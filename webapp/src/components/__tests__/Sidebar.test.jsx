import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../Sidebar.jsx';

describe('Sidebar', () => {
  it('renders tags header with available tags', () => {
    render(
      <Sidebar
        activeTag=""
        onSelectTag={vi.fn()}
        availableTags={['work', 'ideas']}
        onOpenSettings={vi.fn()}
      />
    );

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /#work/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /#ideas/i })).toBeInTheDocument();
  });

  it('calls onSelectTag with clicked tag', async () => {
    const user = userEvent.setup();
    const onSelectTag = vi.fn();

    render(
      <Sidebar
        activeTag=""
        onSelectTag={onSelectTag}
        availableTags={['work']}
        onOpenSettings={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /#work/i }));
    expect(onSelectTag).toHaveBeenCalledWith('work');
  });

  it('opens settings from desktop sidebar', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        onOpenSettings={onOpenSettings}
      />
    );

    await user.click(screen.getByRole('button', { name: /settings/i }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('hides settings button on mobile sidebar', () => {
    render(
      <Sidebar
        onOpenSettings={vi.fn()}
        isMobile
      />
    );

    expect(screen.queryByRole('button', { name: /settings/i })).not.toBeInTheDocument();
  });
});
