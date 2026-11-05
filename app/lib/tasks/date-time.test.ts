import { describe, expect, it } from "vitest";

import {
  addDays,
  formatDueChip,
  formatDueHint,
  formatMonthTitle,
  getDefaultDue,
  getMonthGrid,
  getZonedNow,
  isDateInRange,
  zonedDateTimeToIso,
} from "./date-time";

const now = new Date("2026-11-05T13:07:42Z");

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
  it("uses the current local minute with zero seconds", () => {
    expect(getDefaultDue(now, "Europe/Moscow")).toEqual({
      date: "2026-11-05",
      time: "16:07",
    });
  });

  it("keeps the user timezone across UTC day boundaries", () => {
    expect(getDefaultDue(new Date("2026-11-05T22:30:00Z"), "Europe/Moscow")).toEqual({
      date: "2026-11-06",
      time: "01:30",
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
