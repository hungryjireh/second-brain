function toValidDate(value, fallbackToNow = false) {
  const date = value ? new Date(value) : fallbackToNow ? new Date() : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatShortDateTime(value) {
  const date = toValidDate(value, true);
  if (!date) return "";
  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateLabel} ${timeLabel}`;
}

export function formatTodayLabel(date) {
  const dayName = date
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  const day = date.getDate();
  const month = date
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  return `${dayName} ${day} ${month}`;
}

export function formatTimeLabel(value) {
  const date = toValidDate(value, true);
  if (!date) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPublishedDateTime(value) {
  const date = toValidDate(value, false);
  if (!date) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function unixToDatetimeLocal(unixTs) {
  if (!unixTs) return "";
  const date = new Date(unixTs * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalToUnix(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor(parsed.getTime() / 1000);
}
