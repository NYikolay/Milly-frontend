export interface ZonedNow {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface MonthCell {
  date: string;
  day: number;
  inCurrentMonth: boolean;
}

interface ZonedParts extends ZonedNow {
  second: number;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

interface TimeParts {
  hour: number;
  minute: number;
}

const MONTH_TITLES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const MIN_API_DATE = "2025-01-01";
const MAX_API_DATE = "2100-12-31";
const MONTH_CELL_COUNT = 42;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

function parseDate(date: string): DateParts {
  const [year, month, day] = date.split("-").map(Number);

  return { year, month, day };
}

function parseTime(time: string): TimeParts {
  const [hour, minute] = time.split(":").map(Number);

  return { hour, minute };
}

function formatNumericDate(date: string): string {
  const { year, month, day } = parseDate(date);

  return `${pad(day)}.${pad(month)}.${String(year).padStart(4, "0")}`;
}

function getZonedParts(now: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const read = (type: string): number => {
    const part = parts.find((item) => item.type === type);

    return part ? Number(part.value) : Number.NaN;
  };

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function getTimeZoneOffsetMs(timestamp: number, timeZone: string): number {
  const parts = getZonedParts(new Date(timestamp), timeZone);
  const utcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return utcTimestamp - timestamp;
}

export function getZonedNow(now: Date, timeZone: string): ZonedNow {
  const { year, month, day, hour, minute } = getZonedParts(now, timeZone);

  return { year, month, day, hour, minute };
}

export function getDefaultDue(
  now: Date,
  timeZone: string,
): { date: string; time: string } {
  const { year, month, day, hour, minute } = getZonedNow(now, timeZone);

  return {
    date: formatDate(year, month, day),
    time: `${pad(hour)}:${pad(minute)}`,
  };
}

export function zonedDateTimeToIso(
  date: string,
  time: string,
  timeZone: string,
): string {
  const { year, month, day } = parseDate(date);
  const { hour, minute } = parseTime(time);
  const wallClockTimestamp = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = getTimeZoneOffsetMs(wallClockTimestamp, timeZone);
  const adjustedTimestamp = wallClockTimestamp - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(adjustedTimestamp, timeZone);

  return new Date(wallClockTimestamp - secondOffset).toISOString();
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDate(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return formatDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

export function formatDueChip(
  date: string,
  time: string,
  timeZone: string,
  now: Date,
): string {
  const { year, month, day } = getZonedNow(now, timeZone);
  const today = formatDate(year, month, day);

  if (date === today) {
    return `Сегодня, ${time}`;
  }

  if (date === addDays(today, 1)) {
    return `Завтра, ${time}`;
  }

  return `На ${formatNumericDate(date)}, ${time}`;
}

export function formatDueHint(
  date: string,
  time: string,
  timeZone: string,
  now: Date,
  isRecurring: boolean,
): string {
  if (isRecurring) {
    return `С ${formatNumericDate(date)}, ежедневно в ${time}`;
  }

  return formatDueChip(date, time, timeZone, now);
}

export function formatMonthTitle(year: number, month: number): string {
  const title = MONTH_TITLES[month - 1] ?? "";

  return `${title} ${year}`;
}

export function getMonthGrid(year: number, month: number): MonthCell[] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const start = addDays(formatDate(year, month, 1), -mondayOffset);
  const cells: MonthCell[] = [];

  for (let index = 0; index < MONTH_CELL_COUNT; index += 1) {
    const date = addDays(start, index);
    const { year: cellYear, month: cellMonth, day } = parseDate(date);

    cells.push({
      date,
      day,
      inCurrentMonth: cellYear === year && cellMonth === month,
    });
  }

  return cells;
}

export function isDateInRange(date: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date >= MIN_API_DATE &&
    date <= MAX_API_DATE
  );
}
