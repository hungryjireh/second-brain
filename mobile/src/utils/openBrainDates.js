function toValidDate(value, fallbackToNow = false) {
  const date = value ? new Date(value) : (fallbackToNow ? new Date() : null);
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatShortDateTime(value) {
  const date = toValidDate(value, true);
  if (!date) return '';
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${dateLabel} ${timeLabel}`;
}

export function formatPublishedDateTime(value) {
  const date = toValidDate(value, false);
  if (!date) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
