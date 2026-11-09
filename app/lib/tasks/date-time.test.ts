import { describe, expect, it } from "vitest";

import {
  addDays,
  formatDueChip,
  formatDueHint,
  formatMonthTitle,
  formatNumericDate,
  formatZonedDate,
  formatZonedDateTime,
  formatZonedTime,
  formatZonedToday,
  formatZonedTodayLabel,
  getDefaultDue,
  getMonthGrid,
  getZonedNow,
  isDateInRange,
  isValidTime,
  zonedDateTimeToIso,
} from "./date-time";

const now = new Date("2026-11-05T13:07:42Z");

describe("formatZonedToday", () => {
  it("formats the local date in the user timezone", () => {
    expect(formatZonedToday(now, "Europe/Moscow")).toBe("2026-11-05");
    expect(
      formatZonedToday(new Date("2026-11-05T22:30:00Z"), "Europe/Moscow"),
    ).toBe("2026-11-06");
  });
});

describe("formatZonedTodayLabel", () => {
  it("formats the weekday, day and month in the user timezone", () => {
    expect(
      formatZonedTodayLabel(
        new Date("2026-11-05T13:07:42Z"),
        "Europe/Moscow",
      ),
    ).toBe("Четверг, 5 ноября");
  });

  it("uses the user timezone at the UTC day boundary", () => {
    expect(
      formatZonedTodayLabel(
        new Date("2026-11-05T22:30:00Z"),
        "Europe/Moscow",
      ),
    ).toBe("Пятница, 6 ноября");
  });
});

describe("formatZonedTime", () => {
  it("formats an ISO instant in the user timezone", () => {
    expect(
      formatZonedTime("2026-11-06T08:00:00.000Z", "Europe/Moscow"),
    ).toBe("11:00");
    expect(formatZonedTime("2026-11-06T08:00:00.000Z", "UTC")).toBe(
      "08:00",
    );
  });
});

describe("zoned date formatting", () => {
  it("formats a zoned calendar date across midnight", () => {
    expect(
      formatZonedDate("2026-11-06T21:30:00.000Z", "Europe/Moscow"),
    ).toBe("2026-11-07");
  });

  it("formats a zoned date and time", () => {
    expect(
      formatZonedDateTime("2026-11-06T07:00:00.000Z", "Europe/Moscow"),
    ).toBe("06.11.2026, 10:00");
  });
});

describe("getZonedNow", () => {
  it("returns local parts in the user timezone", () => {
    expect(getZonedNow(now, "Europe/Moscow")).toEqual({
      year: 2026,
      month: 11,
      day: 5,
      hour: 16,
      minute: 7,
    });
  });
});

describe("getDefaultDue", () => {
  it("uses the start of the next local hour", () => {
    expect(getDefaultDue(now, "Europe/Moscow")).toEqual({
      date: "2026-11-05",
      time: "17:00",
    });
  });

  it("uses the next hour even when the local minute is exactly zero", () => {
    expect(
      getDefaultDue(new Date("2026-11-05T18:00:00Z"), "Europe/Moscow"),
    ).toEqual({
      date: "2026-11-05",
      time: "22:00",
    });
  });

  it("keeps the user timezone across UTC day boundaries", () => {
    expect(getDefaultDue(new Date("2026-11-05T22:30:00Z"), "Europe/Moscow")).toEqual({
      date: "2026-11-06",
      time: "02:00",
    });
  });

  it("rolls over to the next date near local midnight", () => {
    expect(getDefaultDue(new Date("2026-11-05T20:20:00Z"), "Europe/Moscow")).toEqual({
      date: "2026-11-06",
      time: "00:00",
    });
  });
});

describe("zonedDateTimeToIso", () => {
  it("converts a Moscow local time to UTC", () => {
    expect(zonedDateTimeToIso("2026-11-06", "10:00", "Europe/Moscow")).toBe(
      "2026-11-06T07:00:00.000Z",
    );
  });

  it("handles the New York spring-forward offset", () => {
    expect(
      zonedDateTimeToIso("2026-03-08", "03:30", "America/New_York"),
    ).toBe("2026-03-08T07:30:00.000Z");
  });

  it("handles the New York standard-time offset", () => {
    expect(
      zonedDateTimeToIso("2026-11-01", "03:30", "America/New_York"),
    ).toBe("2026-11-01T08:30:00.000Z");
  });
});

describe("date formatting", () => {
  it("formats today, tomorrow and other dates in the chip", () => {
    expect(formatDueChip("2026-11-05", "16:00", "Europe/Moscow", now)).toBe(
      "Сегодня, 16:00",
    );
    expect(formatDueChip("2026-11-06", "16:00", "Europe/Moscow", now)).toBe(
      "Завтра, 16:00",
    );
    expect(formatDueChip("2026-11-11", "16:00", "Europe/Moscow", now)).toBe(
      "На 11.11.2026, 16:00",
    );
  });

  it("formats the recurring and one-off hints", () => {
    expect(
      formatDueHint("2026-11-11", "16:00", "Europe/Moscow", now, true),
    ).toBe("С 11.11.2026, ежедневно в 16:00");
    expect(
      formatDueHint("2026-11-05", "16:00", "Europe/Moscow", now, false),
    ).toBe("Сегодня, 16:00");
    expect(
      formatDueHint("2026-11-11", "16:00", "Europe/Moscow", now, false),
    ).toBe("На 11.11.2026, 16:00");
  });

  it("uses the numeric date in the one-off hint for tomorrow", () => {
    const hint = formatDueHint(
      "2026-11-06",
      "16:00",
      "Europe/Moscow",
      now,
      false,
    );

    expect(hint).toBe("На 06.11.2026, 16:00");
    expect(hint).not.toContain("Завтра");
  });
});

describe("isValidTime", () => {
  it("accepts zero-padded times within the day", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("09:05")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
  });

  it("rejects empty, out-of-range and non-padded times", () => {
    expect(isValidTime("")).toBe(false);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("23:60")).toBe(false);
    expect(isValidTime("9:05")).toBe(false);
    expect(isValidTime("09:5")).toBe(false);
    expect(isValidTime("09:05:00")).toBe(false);
  });
});

describe("calendar helpers", () => {
  it("builds a Monday-first 42-cell grid", () => {
    const grid = getMonthGrid(2026, 11);

    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({
      date: "2026-10-26",
      day: 26,
      inCurrentMonth: false,
    });
    expect(grid[41]).toEqual({
      date: "2026-12-06",
      day: 6,
      inCurrentMonth: false,
    });
  });

  it("formats the month title and adds calendar days", () => {
    expect(formatMonthTitle(2026, 11)).toBe("Ноябрь 2026");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("accepts only the API date range", () => {
    expect(isDateInRange("2025-01-01")).toBe(true);
    expect(isDateInRange("2100-12-31")).toBe(true);
    expect(isDateInRange("2024-12-31")).toBe(false);
    expect(isDateInRange("2101-01-01")).toBe(false);
  });
});

describe("isDateInRange with custom bounds", () => {
  it("rejects dates before the selected minimum", () => {
    expect(isDateInRange("2026-11-04", "2026-11-05", "2100-12-31")).toBe(false);
    expect(isDateInRange("2026-11-05", "2026-11-05", "2100-12-31")).toBe(true);
    expect(isDateInRange("2101-01-01", "2026-11-05", "2100-12-31")).toBe(false);
  });
});

describe("formatNumericDate", () => {
  it("formats an ISO date as DD.MM.YYYY", () => {
    expect(formatNumericDate("2026-10-29")).toBe("29.10.2026");
  });
});
