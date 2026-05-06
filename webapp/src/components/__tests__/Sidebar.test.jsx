import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../Sidebar.jsx';

describe('Sidebar', () => {
  const counts = { reminder: 1, todo: 2, thought: 0, note: 3 };

  it('calls onSelect with the clicked category', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Sidebar
        active="all"
        onSelect={onSelect}
        counts={counts}
        onOpenSettings={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'TODOs 2' }));
    expect(onSelect).toHaveBeenCalledWith('todo');
  });

  it('shows aggregate count for All and category-specific counts', () => {
    render(
      <Sidebar
        active="all"
        onSelect={vi.fn()}
        counts={counts}
        onOpenSettings={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'All 6' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reminders 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TODOs 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notes 3' })).toBeInTheDocument();
  });

  it('opens settings from desktop sidebar', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        active="all"
        onSelect={vi.fn()}
        counts={counts}
        onOpenSettings={onOpenSettings}
      />
    );

    await user.click(screen.getByRole('button', { name: /settings/i }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('hides settings button on mobile sidebar', () => {
    render(
      <Sidebar
        active="all"
        onSelect={vi.fn()}
        counts={counts}
        onOpenSettings={vi.fn()}
        isMobile
      />
    );

    expect(screen.queryByRole('button', { name: /settings/i })).not.toBeInTheDocument();
  });
});
