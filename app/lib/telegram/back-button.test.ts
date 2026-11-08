import { describe, expect, it, vi } from "vitest";

import { bindTelegramBackButton } from "./back-button";
import type { TelegramWebApp } from "./types";

function createWebApp(versionAtLeast: boolean) {
  const onClick = vi.fn();
  const offClick = vi.fn();
  const show = vi.fn();
  const hide = vi.fn();
  const app = {
    isVersionAtLeast: () => versionAtLeast,
    BackButton: { isVisible: false, onClick, offClick, show, hide },
  } as unknown as TelegramWebApp;
  return { app, onClick, offClick, show, hide };
}

describe("bindTelegramBackButton", () => {
  it("shows the native back button and cleans up", () => {
    const { app, onClick, offClick, show, hide } = createWebApp(true);
    const onBack = vi.fn();
    const cleanup = bindTelegramBackButton(app, onBack);
    expect(onClick).toHaveBeenCalledWith(onBack);
    expect(show).toHaveBeenCalledTimes(1);
    cleanup();
    expect(offClick).toHaveBeenCalledWith(onBack);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the API is too old", () => {
    const { app, onClick, show } = createWebApp(false);
    const cleanup = bindTelegramBackButton(app, () => {});
    expect(onClick).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
    expect(() => cleanup()).not.toThrow();
  });

  it("does nothing without a web app", () => {
    expect(() => bindTelegramBackButton(null, () => {})()).not.toThrow();
  });
});
