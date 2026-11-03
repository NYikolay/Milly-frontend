import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BOOT_WATCHDOG_TIMEOUT_MS,
  clearBootWatchdog,
  getBootWatchdogScript,
} from "./watchdog";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("boot watchdog", () => {
  it("uses the five second timeout", () => {
    expect(BOOT_WATCHDOG_TIMEOUT_MS).toBe(5000);
    expect(getBootWatchdogScript()).toContain("5000");
  });

  it("builds a deterministic, self-contained inline script", () => {
    const script = getBootWatchdogScript();

    expect(getBootWatchdogScript()).toBe(script);
    expect(script).not.toContain("</script>");
    expect(script).toContain("__millyBootWatchdog");
    expect(script).toContain("milly-boot-fallback");
    expect(script).toContain("Нет соединения");
    expect(script).toContain(
      "Не удалось загрузить приложение. Проверьте подключение и попробуйте снова.",
    );
    expect(script).toContain("Повторить");
    expect(script).toContain("location.reload");
    expect(script).toContain("role");
    expect(script).toContain("alert");
    expect(script).toContain("aria-live");
    expect(script).toContain("assertive");
    expect(script).toContain("aria-atomic");
    expect(script).toContain("appTheme");
    expect(script).toContain("prefers-color-scheme");
    expect(script).toContain("safe-area-inset");
    expect(script).toContain("calc(15px + env(safe-area-inset-top))");
    expect(script).toContain(
      "padding:calc(15px + env(safe-area-inset-top)) 15px calc(15px + env(safe-area-inset-bottom))",
    );
    expect(script).toContain("max-width:28rem");
    expect(script).toContain("gap:15px");
    expect(script).toContain("line-height:29px");
    expect(script).toContain("letter-spacing:-0.8px");
    expect(script).toContain("line-height:1.3");
    expect(script).toContain("#7a7d83");
    expect(script).toContain("tabindex");
  });

  it("does not throw outside the browser", () => {
    expect(typeof window).toBe("undefined");
    expect(() => clearBootWatchdog()).not.toThrow();
  });

  it("clears the published watchdog", () => {
    const clear = vi.fn();
    vi.stubGlobal("window", { __millyBootWatchdog: { clear } });

    clearBootWatchdog();

    expect(clear).toHaveBeenCalledTimes(1);
  });
});
