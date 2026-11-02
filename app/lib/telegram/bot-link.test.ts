import { afterEach, describe, expect, it, vi } from "vitest";

import { getBotStartUrl, getBotUsername, openBotStartLink } from "./bot-link";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("bot link", () => {
  it("builds the startapp url from the configured bot username", () => {
    vi.stubEnv("VITE_TG_BOT_USERNAME", "millyco_bot");

    expect(getBotUsername()).toBe("millyco_bot");
    expect(getBotStartUrl()).toBe("https://t.me/millyco_bot?startapp=auth");
  });

  it("strips a leading @ from the bot username", () => {
    vi.stubEnv("VITE_TG_BOT_USERNAME", " @millyco_bot ");

    expect(getBotUsername()).toBe("millyco_bot");
    expect(getBotStartUrl()).toBe("https://t.me/millyco_bot?startapp=auth");
  });

  it("returns null for an empty bot username", () => {
    vi.stubEnv("VITE_TG_BOT_USERNAME", "   ");

    expect(getBotUsername()).toBeNull();
    expect(getBotStartUrl()).toBeNull();
  });

  it("returns null when the bot username is not configured", () => {
    vi.stubEnv("VITE_TG_BOT_USERNAME", undefined);

    expect(getBotUsername()).toBeNull();
    expect(getBotStartUrl()).toBeNull();
  });

  it("does not open a link when the bot username is missing", () => {
    vi.stubEnv("VITE_TG_BOT_USERNAME", "");

    expect(openBotStartLink(null)).toBe(false);
  });
});
