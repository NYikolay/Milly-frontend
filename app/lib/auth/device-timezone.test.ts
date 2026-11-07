import { afterEach, describe, expect, it, vi } from "vitest";

import { getDeviceTimeZone } from "./device-timezone";

function mockResolvedTimeZone(timeZone: string): void {
  vi.spyOn(
    Intl.DateTimeFormat.prototype,
    "resolvedOptions",
  ).mockReturnValue({
    timeZone,
  } as Intl.ResolvedDateTimeFormatOptions);
}

describe("getDeviceTimeZone", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the IANA time zone reported by Intl", () => {
    mockResolvedTimeZone("Europe/Moscow");

    expect(getDeviceTimeZone()).toBe("Europe/Moscow");
  });

  it("falls back to UTC when the resolved zone is empty", () => {
    mockResolvedTimeZone("   ");

    expect(getDeviceTimeZone()).toBe("UTC");
  });

  it("falls back to UTC when Intl cannot resolve a zone", () => {
    vi.spyOn(
      Intl.DateTimeFormat.prototype,
      "resolvedOptions",
    ).mockImplementation(() => {
      throw new RangeError("unsupported");
    });

    expect(getDeviceTimeZone()).toBe("UTC");
  });
});
