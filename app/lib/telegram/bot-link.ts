import { supportsVersion } from "./client";
import type { TelegramWebApp } from "./types";

const BOT_START_PATH = "?startapp=auth";

export function getBotUsername(): string | null {
  const configured = import.meta.env.VITE_TG_BOT_USERNAME;
  const username = configured?.trim().replace(/^@/, "") ?? "";

  return username === "" ? null : username;
}

export function getBotStartUrl(): string | null {
  const username = getBotUsername();

  return username === null
    ? null
    : `https://t.me/${username}${BOT_START_PATH}`;
}

export function openBotStartLink(webApp: TelegramWebApp | null): boolean {
  const url = getBotStartUrl();

  if (url === null) {
    return false;
  }

  if (
    supportsVersion("6.1", webApp) &&
    typeof webApp?.openTelegramLink === "function"
  ) {
    webApp.openTelegramLink(url);

    return true;
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");

    return true;
  }

  return false;
}
