import { fireEvent, render } from '@testing-library/react-native';
import SecondBrainEntryCard from '../SecondBrainEntryCard';

const styles = {
  card: {},
  cardTopRow: {},
  cardMainCol: {},
  cardMetaRow: {},
  cardIcon: {},
  priorityText: {},
  cardTitle: {},
  cardBody: {},
  cardActionCol: {},
  cardActionRow: {},
  secondaryButton: {},
  secondaryButtonText: {},
  tagPill: {},
  tagPillText: {},
  deleteButton: {},
  deleteButtonConfirm: {},
  deleteText: {},
  deleteTextConfirm: {},
  metaInfoRow: {},
  reminderMetaPill: {},
  reminderMetaText: {},
  metaDot: {},
  metaText: {},
  tagsRow: {},
  itemTagPill: {},
  itemTagText: {},
};

const theme = {
  colors: {
    textSecondary: '#777',
  },
};

describe('SecondBrainEntryCard', () => {
  it('renders entry content and calls handlers', () => {
    const onOpenEntry = jest.fn();
    const onCloseSwipe = jest.fn();
    const onStartEdit = jest.fn();
    const onToggleArchive = jest.fn();
    const onDownloadIcs = jest.fn();
    const onRequestDelete = jest.fn();

    const entry = {
      id: 7,
      category: 'reminder',
      title: 'Pay bill',
      summary: 'Monthly dues',
      priority: 8,
      remind_at: 1,
      created_at: 1,
      tags: ['finance'],
      is_archived: false,
    };

    const { getByText } = render(
      <SecondBrainEntryCard
        entry={entry}
        styles={styles}
        theme={theme}
        timezone="UTC"
        isBusy={false}
        isSwipeOpen={false}
        isDeleteConfirm={false}
        onOpenEntry={onOpenEntry}
        onCloseSwipe={onCloseSwipe}
        onStartEdit={onStartEdit}
        onToggleArchive={onToggleArchive}
        onDownloadIcs={onDownloadIcs}
        onRequestDelete={onRequestDelete}
        formatRemindAt={() => '2026-05-09 10:00'}
        formatDate={() => '2026-05-09'}
      />
    );

    expect(getByText('Pay bill')).toBeTruthy();
    expect(getByText('Monthly dues')).toBeTruthy();
    expect(getByText('Mark Done')).toBeTruthy();
    expect(getByText('#finance')).toBeTruthy();

    fireEvent.press(getByText('Edit'), { stopPropagation: jest.fn() });
    fireEvent.press(getByText('Mark Done'), { stopPropagation: jest.fn() });
    fireEvent.press(getByText('.ics'), { stopPropagation: jest.fn() });

    expect(onStartEdit).toHaveBeenCalledWith(entry);
    expect(onToggleArchive).toHaveBeenCalledWith(entry);
    expect(onDownloadIcs).toHaveBeenCalledWith(7);

    fireEvent.press(getByText('Pay bill'));
    expect(onOpenEntry).toHaveBeenCalledWith(entry);
    expect(onCloseSwipe).not.toHaveBeenCalled();
  });
});
