function toValidDate(value, fallbackToNow = false) {
  const date = value ? new Date(value) : fallbackToNow ? new Date() : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatElapsedTime(elapsedMs) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");
  return `${minutes}:${paddedSeconds}`;
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

export function createDateFormatters(timezone) {
  return {
    dayKeyFormatter: new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    timeFormatter: new Intl.DateTimeFormat("en-SG", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }),
    shortDateFormatter: new Intl.DateTimeFormat("en-SG", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
    }),
    remindDateFormatter: new Intl.DateTimeFormat("en-SG", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
  };
}

export function formatDateWithFormatters(unixTs, formatters) {
  if (!unixTs) return null;
  const date = new Date(unixTs * 1000);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const dayKey = formatters.dayKeyFormatter.format(date);
  const todayKey = formatters.dayKeyFormatter.format(now);
  const yesterdayKey = formatters.dayKeyFormatter.format(yesterday);
  const time = formatters.timeFormatter.format(date);

  if (dayKey === todayKey) return `Today · ${time}`;
  if (dayKey === yesterdayKey) return `Yesterday · ${time}`;
  return `${formatters.shortDateFormatter.format(date)} · ${time}`;
}

export function formatRemindAtWithFormatters(unixTs, formatters) {
  if (!unixTs) return null;
  const date = new Date(unixTs * 1000);
  const now = new Date();
  const dayKey = formatters.dayKeyFormatter.format(date);
  const todayKey = formatters.dayKeyFormatter.format(now);
  const time = formatters.timeFormatter.format(date);

  if (dayKey === todayKey) return `${time} tonight`;
  return `${formatters.remindDateFormatter.format(date)} · ${time}`;
}
