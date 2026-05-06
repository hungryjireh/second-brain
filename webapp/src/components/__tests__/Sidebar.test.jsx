import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../Sidebar.jsx';

describe('Sidebar', () => {
  it('does not render tags in desktop sidebar', () => {
    render(
      <Sidebar
        onOpenSettings={vi.fn()}
      />
    );

    expect(screen.queryByText(/tags \(\d+\/10\)/i)).not.toBeInTheDocument();
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

  it('opens import conversations from desktop sidebar', async () => {
    const user = userEvent.setup();
    const onOpenImportConversations = vi.fn();

    render(
      <Sidebar
        onOpenSettings={vi.fn()}
        onOpenImportConversations={onOpenImportConversations}
      />
    );

    await user.click(screen.getByRole('button', { name: /import llm conversations/i }));
    expect(onOpenImportConversations).toHaveBeenCalledTimes(1);
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
