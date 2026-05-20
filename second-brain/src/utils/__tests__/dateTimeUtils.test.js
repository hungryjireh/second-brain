import {
  createDateFormatters,
  formatDateWithFormatters,
  formatElapsedTime,
  formatRemindAtWithFormatters,
} from "../dateTimeUtils";

describe("dateTimeUtils second brain helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-20T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates formatter bundle for a timezone", () => {
    const formatters = createDateFormatters("UTC");
    expect(formatters.dayKeyFormatter).toBeTruthy();
    expect(formatters.timeFormatter).toBeTruthy();
    expect(formatters.shortDateFormatter).toBeTruthy();
    expect(formatters.remindDateFormatter).toBeTruthy();
  });

  it("formats entry date labels for today, yesterday, and older entries", () => {
    const formatters = createDateFormatters("UTC");
    const todayUnix = Math.floor(
      new Date("2026-05-20T09:45:00.000Z").getTime() / 1000,
    );
    const yesterdayUnix = Math.floor(
      new Date("2026-05-19T09:45:00.000Z").getTime() / 1000,
    );
    const olderUnix = Math.floor(
      new Date("2026-05-12T09:45:00.000Z").getTime() / 1000,
    );

    expect(formatDateWithFormatters(todayUnix, formatters)).toMatch(
      /^Today · /,
    );
    expect(formatDateWithFormatters(yesterdayUnix, formatters)).toMatch(
      /^Yesterday · /,
    );
    const olderLabel = formatDateWithFormatters(olderUnix, formatters);
    expect(olderLabel).toContain(" · ");
    expect(olderLabel.startsWith("Today · ")).toBe(false);
    expect(olderLabel.startsWith("Yesterday · ")).toBe(false);
  });

  it("formats reminder labels for today and non-today", () => {
    const formatters = createDateFormatters("UTC");
    const todayUnix = Math.floor(
      new Date("2026-05-20T19:00:00.000Z").getTime() / 1000,
    );
    const laterUnix = Math.floor(
      new Date("2026-05-22T19:00:00.000Z").getTime() / 1000,
    );

    expect(formatRemindAtWithFormatters(todayUnix, formatters)).toMatch(
      /tonight$/,
    );
    expect(formatRemindAtWithFormatters(laterUnix, formatters)).toMatch(/ · /);
  });

  it("returns null when unix timestamp is missing", () => {
    const formatters = createDateFormatters("UTC");
    expect(formatDateWithFormatters(null, formatters)).toBeNull();
    expect(formatRemindAtWithFormatters(undefined, formatters)).toBeNull();
  });

  it("formats elapsed milliseconds as m:ss", () => {
    expect(formatElapsedTime(0)).toBe("0:00");
    expect(formatElapsedTime(61000)).toBe("1:01");
    expect(formatElapsedTime(-500)).toBe("0:00");
  });
});
