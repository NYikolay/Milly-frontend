import type { TelegramWebApp } from "./types";

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
}

export function isTelegramEnvironment(
  app: TelegramWebApp | null = getTelegramWebApp(),
): boolean {
  return app !== null && app.platform !== "unknown";
}

export function supportsVersion(
  version: string,
  app: TelegramWebApp | null = getTelegramWebApp(),
): boolean {
  if (!app) {
    return false;
  }

  return app.isVersionAtLeast(version);
}
