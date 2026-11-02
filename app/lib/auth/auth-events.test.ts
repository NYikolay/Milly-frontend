import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  notifyAuthFailure,
  resetAuthFailureNotification,
  setAuthFailureListener,
} from "./auth-events";
import type { AuthFailure } from "./types";

const failure: AuthFailure = {
  status: "reauth-required",
  reason: "session_expired",
};

beforeEach(() => {
  setAuthFailureListener(null);
  resetAuthFailureNotification();
});

describe("auth events", () => {
  it("delivers the first notification to the listener", () => {
    const listener = vi.fn();
    setAuthFailureListener(listener);

    notifyAuthFailure(failure);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(failure);
  });

  it("ignores repeated notifications until resetAuthFailureNotification", () => {
    const listener = vi.fn();
    setAuthFailureListener(listener);

    notifyAuthFailure(failure);
    notifyAuthFailure({ status: "no-init-data", reason: "init_data_missing" });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("delivers again after resetAuthFailureNotification", () => {
    const listener = vi.fn();
    setAuthFailureListener(listener);

    notifyAuthFailure(failure);
    resetAuthFailureNotification();
    notifyAuthFailure(failure);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("stops delivery when the listener is set to null", () => {
    const listener = vi.fn();
    setAuthFailureListener(listener);

    notifyAuthFailure(failure);
    setAuthFailureListener(null);
    resetAuthFailureNotification();
    notifyAuthFailure(failure);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("marks the notification as sent even when there is no listener", () => {
    const listener = vi.fn();

    notifyAuthFailure(failure);
    setAuthFailureListener(listener);
    notifyAuthFailure(failure);

    expect(listener).not.toHaveBeenCalled();

    resetAuthFailureNotification();
    notifyAuthFailure(failure);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
