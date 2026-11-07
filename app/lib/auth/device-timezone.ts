const FALLBACK_TIME_ZONE = "UTC";

export function getDeviceTimeZone(): string {
  try {
    const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

    return timeZone.trim() === "" ? FALLBACK_TIME_ZONE : timeZone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}
