import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, ApiNetworkError } from "~/lib/api/errors";
import type { HttpRequestOptions } from "~/lib/api/http";
import { requestJson } from "~/lib/api/http";
import type { AuthResponse, AuthUser, TokenResponse } from "~/lib/api/types";
import {
  loginFromTelegram,
  refreshAccessToken,
} from "~/lib/auth/auth-api";
import {
  resetAuthFailureNotification,
  setAuthFailureListener,
} from "~/lib/auth/auth-events";
import { AuthSessionError, EmptyInitDataError } from "~/lib/auth/errors";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "~/lib/auth/token-store";
import type { AuthFailure } from "~/lib/auth/types";

import { apiRequest } from "./client";

vi.mock("~/lib/api/http", () => ({
  requestJson: vi.fn(),
}));

vi.mock("~/lib/auth/auth-api", () => ({
  refreshAccessToken: vi.fn(),
  loginFromTelegram: vi.fn(),
}));

const requestJsonMock = vi.mocked(requestJson);
const refreshAccessTokenMock = vi.mocked(refreshAccessToken);
const loginFromTelegramMock = vi.mocked(loginFromTelegram);

const user: AuthUser = {
  id: 1,
  created_at: "2026-11-02T10:00:00Z",
  telegram_profile: {
    telegram_id: 100,
    is_bot: null,
    first_name: "Milly",
    last_name: null,
    username: null,
    language_code: "en",
    is_premium: false,
    added_to_attachment_menu: null,
    allows_write_to_pm: null,
    photo_url: null,
  },
};

const tokenResponse: TokenResponse = {
  access_token: "access-refreshed",
  token_type: "bearer",
  expires_in: 3600,
};

const authResponse: AuthResponse = {
  access_token: "access-login",
  token_type: "bearer",
  expires_in: 3600,
  user,
};

function apiError(status: number): ApiError {
  return new ApiError("request failed", {
    status,
    code: "test_error",
    requestId: "request-1",
  });
}

function abortError(): Error {
  const error = new Error("aborted");
  error.name = "AbortError";

  return error;
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function requestOptions(callIndex = 0): HttpRequestOptions {
  const options = requestJsonMock.mock.calls[callIndex]?.[1];

  if (!options) {
    throw new Error("requestJson was not called with options");
  }

  return options;
}

function tokenAt(callIndex: number): string | null | undefined {
  return requestJsonMock.mock.calls[callIndex]?.[1]?.token;
}

function mockRefreshSuccess(token = "access-refreshed"): void {
  refreshAccessTokenMock.mockImplementation(async () => {
    setAccessToken(token);

    return { ...tokenResponse, access_token: token };
  });
}

function mockLoginSuccess(token = "access-login"): void {
  loginFromTelegramMock.mockImplementation(async () => {
    setAccessToken(token);

    return { ...authResponse, access_token: token };
  });
}

async function expectAuthSessionError(
  promise: Promise<unknown>,
  failure: AuthFailure,
): Promise<void> {
  let caught: unknown;

  try {
    await promise;
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(AuthSessionError);

  if (!(caught instanceof AuthSessionError)) {
    throw caught;
  }

  expect(caught.failure).toEqual(failure);
}

beforeEach(() => {
  clearAccessToken();
  setAuthFailureListener(null);
  resetAuthFailureNotification();
  requestJsonMock.mockReset();
  refreshAccessTokenMock.mockReset();
  loginFromTelegramMock.mockReset();
});

describe("apiRequest auth options", () => {
  it("adds the current token by default", async () => {
    setAccessToken("access-1");
    requestJsonMock.mockResolvedValue({ ok: true });

    await expect(apiRequest("/items")).resolves.toEqual({ ok: true });

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(requestJsonMock.mock.calls[0]?.[0]).toBe("/items");
    expect(requestOptions()).toMatchObject({ method: "GET", token: "access-1" });
  });

  it("sends one unauthenticated request and never refreshes when auth is false", async () => {
    setAccessToken("access-1");
    const error = apiError(401);
    requestJsonMock.mockRejectedValue(error);

    await expect(apiRequest("/public", { auth: false })).rejects.toBe(error);

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(requestOptions().token).toBeUndefined();
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
  });

  it("sends one authenticated request and never refreshes when retryOnUnauthorized is false", async () => {
    setAccessToken("access-1");
    const error = apiError(401);
    requestJsonMock.mockRejectedValue(error);

    await expect(
      apiRequest("/auth/me", { retryOnUnauthorized: false }),
    ).rejects.toBe(error);

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(requestOptions().token).toBe("access-1");
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
  });
});

describe("apiRequest retry flow", () => {
  it("refreshes after a 401 and retries once with the new token, preserving request options", async () => {
    setAccessToken("access-1");
    const controller = new AbortController();
    mockRefreshSuccess("access-2");
    requestJsonMock.mockImplementation((_path, options) => {
      if (options?.token === "access-1") {
        return Promise.reject(apiError(401));
      }

      return Promise.resolve({ ok: true });
    });

    await expect(
      apiRequest("/items", {
        method: "POST",
        body: { name: "Milly" },
        signal: controller.signal,
      }),
    ).resolves.toEqual({ ok: true });

    expect(requestJsonMock).toHaveBeenCalledTimes(2);
    expect(requestJsonMock.mock.calls[0]?.[0]).toBe("/items");
    expect(requestJsonMock.mock.calls[1]?.[0]).toBe("/items");
    expect(tokenAt(0)).toBe("access-1");
    expect(tokenAt(1)).toBe("access-2");

    for (const index of [0, 1]) {
      const options = requestOptions(index);

      expect(options.method).toBe("POST");
      expect(options.body).toEqual({ name: "Milly" });
      expect(options.signal).toBe(controller.signal);
    }

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(refreshAccessTokenMock).toHaveBeenCalledWith();
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
  });

  it("propagates a non-401 original error without refreshing", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    const error = apiError(404);
    requestJsonMock.mockRejectedValue(error);

    await expect(apiRequest("/items")).rejects.toBe(error);

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("propagates an original request timeout without notifying or refreshing", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    const error = new ApiNetworkError("Request timed out");
    requestJsonMock.mockRejectedValue(error);

    await expect(apiRequest("/items")).rejects.toBe(error);

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("propagates an AbortError from the original request without refreshing", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    const error = abortError();
    requestJsonMock.mockRejectedValue(error);

    await expect(apiRequest("/items")).rejects.toBe(error);

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("propagates a non-401 error from the retry without falling back to login", async () => {
    setAccessToken("access-1");
    const error = apiError(404);
    mockRefreshSuccess("access-2");
    requestJsonMock
      .mockRejectedValueOnce(apiError(401))
      .mockRejectedValueOnce(error);

    await expect(apiRequest("/items")).rejects.toBe(error);

    expect(requestJsonMock).toHaveBeenCalledTimes(2);
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
  });

  it("propagates a timeout from the retry after refresh without refreshing again", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    const error = new ApiNetworkError("Request timed out");
    mockRefreshSuccess("access-2");
    requestJsonMock
      .mockRejectedValueOnce(apiError(401))
      .mockRejectedValueOnce(error);

    await expect(apiRequest("/items")).rejects.toBe(error);

    expect(requestJsonMock).toHaveBeenCalledTimes(2);
    expect(tokenAt(1)).toBe("access-2");
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("propagates an AbortError from the retry without falling back to login", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    const controller = new AbortController();
    const error = abortError();
    mockRefreshSuccess("access-2");
    requestJsonMock
      .mockRejectedValueOnce(apiError(401))
      .mockRejectedValueOnce(error);

    await expect(
      apiRequest("/items", { signal: controller.signal }),
    ).rejects.toBe(error);

    expect(requestJsonMock).toHaveBeenCalledTimes(2);
    expect(requestOptions(0).signal).toBe(controller.signal);
    expect(requestOptions(1).signal).toBe(controller.signal);
    expect(refreshAccessTokenMock).toHaveBeenCalledWith();
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("falls back to login when refresh returns 401 and retries with the login token", async () => {
    setAccessToken("access-1");
    refreshAccessTokenMock.mockRejectedValue(apiError(401));
    mockLoginSuccess("access-3");
    requestJsonMock.mockImplementation((_path, options) => {
      if (options?.token === "access-1") {
        return Promise.reject(apiError(401));
      }

      return Promise.resolve({ ok: true });
    });

    await expect(apiRequest("/items")).resolves.toEqual({ ok: true });

    expect(requestJsonMock).toHaveBeenCalledTimes(2);
    expect(tokenAt(0)).toBe("access-1");
    expect(tokenAt(1)).toBe("access-3");
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).toHaveBeenCalledWith();
  });

  it("retries after a fallback login when the refresh retry was unauthorized", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    mockRefreshSuccess("access-2");
    mockLoginSuccess("access-3");
    requestJsonMock.mockImplementation((_path, options) => {
      if (options?.token === "access-3") {
        return Promise.resolve({ ok: true });
      }

      return Promise.reject(apiError(401));
    });

    await expect(apiRequest("/items")).resolves.toEqual({ ok: true });

    expect(requestJsonMock).toHaveBeenCalledTimes(3);
    expect(tokenAt(0)).toBe("access-1");
    expect(tokenAt(1)).toBe("access-2");
    expect(tokenAt(2)).toBe("access-3");
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("runs the full budget and becomes terminal after the final 401", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    mockRefreshSuccess("access-2");
    mockLoginSuccess("access-3");
    requestJsonMock.mockRejectedValue(apiError(401));

    await expectAuthSessionError(apiRequest("/items"), {
      status: "reauth-required",
      reason: "session_expired",
    });

    expect(requestJsonMock).toHaveBeenCalledTimes(3);
    expect(tokenAt(0)).toBe("access-1");
    expect(tokenAt(1)).toBe("access-2");
    expect(tokenAt(2)).toBe("access-3");
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      status: "reauth-required",
      reason: "session_expired",
    });
  });

  it("reports a connection error when refresh returns 500", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    refreshAccessTokenMock.mockRejectedValue(apiError(500));
    requestJsonMock.mockRejectedValue(apiError(401));

    await expectAuthSessionError(apiRequest("/items"), {
      status: "connection-error",
      reason: "server",
    });

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      status: "connection-error",
      reason: "server",
    });
  });

  it("reports a network connection error when refresh times out", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    refreshAccessTokenMock.mockRejectedValue(
      new ApiNetworkError("Request timed out"),
    );
    requestJsonMock.mockRejectedValue(apiError(401));

    await expectAuthSessionError(apiRequest("/items"), {
      status: "connection-error",
      reason: "network",
    });

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      status: "connection-error",
      reason: "network",
    });
  });

  it("reports a network connection error when refresh fails in transport", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    refreshAccessTokenMock.mockRejectedValue(
      new ApiNetworkError("network down"),
    );
    requestJsonMock.mockRejectedValue(apiError(401));

    await expectAuthSessionError(apiRequest("/items"), {
      status: "connection-error",
      reason: "network",
    });

    expect(loginFromTelegramMock).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith({
      status: "connection-error",
      reason: "network",
    });
  });

  it("reports no-init-data when fallback login finds empty init data", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    refreshAccessTokenMock.mockRejectedValue(apiError(401));
    loginFromTelegramMock.mockRejectedValue(new EmptyInitDataError());
    requestJsonMock.mockRejectedValue(apiError(401));

    await expectAuthSessionError(apiRequest("/items"), {
      status: "no-init-data",
      reason: "init_data_missing",
    });

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      status: "no-init-data",
      reason: "init_data_missing",
    });
  });

  it("reports a network connection error when fallback login fails in transport", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    refreshAccessTokenMock.mockRejectedValue(apiError(401));
    loginFromTelegramMock.mockRejectedValue(
      new ApiNetworkError("network down"),
    );
    requestJsonMock.mockRejectedValue(apiError(401));

    await expectAuthSessionError(apiRequest("/items"), {
      status: "connection-error",
      reason: "network",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      status: "connection-error",
      reason: "network",
    });
  });

  it("becomes terminal reauth when refresh and fallback login both return 401", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    refreshAccessTokenMock.mockImplementation(async () => {
      clearAccessToken();
      throw apiError(401);
    });
    loginFromTelegramMock.mockRejectedValue(apiError(401));
    requestJsonMock.mockRejectedValue(apiError(401));

    await expectAuthSessionError(apiRequest("/items"), {
      status: "reauth-required",
      reason: "init_data_invalid",
    });

    expect(getAccessToken()).toBeNull();
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      status: "reauth-required",
      reason: "init_data_invalid",
    });
  });

  it.each([
    [403, "reauth-required", "forbidden"],
    [422, "reauth-required", "init_data_invalid"],
    [503, "connection-error", "server"],
  ] as const)(
    "classifies a runtime refresh %i as %s/%s",
    async (status, expectedStatus, expectedReason) => {
      setAccessToken("access-1");
      const listener = vi.fn<(failure: AuthFailure) => void>();
      setAuthFailureListener(listener);
      refreshAccessTokenMock.mockRejectedValue(apiError(status));
      requestJsonMock.mockRejectedValue(apiError(401));

      await expectAuthSessionError(apiRequest("/items"), {
        status: expectedStatus,
        reason: expectedReason,
      });

      expect(loginFromTelegramMock).not.toHaveBeenCalled();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        status: expectedStatus,
        reason: expectedReason,
      });
    },
  );
});

describe("apiRequest stale token handling", () => {
  it("retries with a newer token when a late 401 arrives after another refresh", async () => {
    setAccessToken("access-1");
    const lateGate = deferred<void>();
    mockRefreshSuccess("access-2");
    requestJsonMock.mockImplementation((path, options) => {
      if (path === "/late" && options?.token === "access-1") {
        return lateGate.promise.then(() => {
          throw apiError(401);
        });
      }

      if (options?.token === "access-1") {
        return Promise.reject(apiError(401));
      }

      return Promise.resolve({ ok: true });
    });

    const late = apiRequest("/late");

    await vi.waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/late",
        expect.objectContaining({ token: "access-1" }),
      );
    });

    await expect(apiRequest("/first")).resolves.toEqual({ ok: true });
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);

    lateGate.resolve();

    await expect(late).resolves.toEqual({ ok: true });

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).not.toHaveBeenCalled();
    expect(
      requestJsonMock.mock.calls.map(([, options]) => options?.token),
    ).toEqual(["access-1", "access-1", "access-2", "access-2"]);
  });

  it("falls back to login when the token-change retry is unauthorized without refreshing again", async () => {
    setAccessToken("access-1");
    const lateGate = deferred<void>();
    mockRefreshSuccess("access-2");
    mockLoginSuccess("access-3");
    requestJsonMock.mockImplementation((path, options) => {
      if (path === "/late" && options?.token === "access-1") {
        return lateGate.promise.then(() => {
          throw apiError(401);
        });
      }

      if (path === "/late" && options?.token === "access-2") {
        return Promise.reject(apiError(401));
      }

      if (path === "/late" && options?.token === "access-3") {
        return Promise.resolve({ ok: true });
      }

      if (path === "/first" && options?.token === "access-1") {
        return Promise.reject(apiError(401));
      }

      return Promise.resolve({ ok: true });
    });

    const late = apiRequest("/late");

    await vi.waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/late",
        expect.objectContaining({ token: "access-1" }),
      );
    });

    await expect(apiRequest("/first")).resolves.toEqual({ ok: true });
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);

    lateGate.resolve();

    await expect(late).resolves.toEqual({ ok: true });

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(loginFromTelegramMock).toHaveBeenCalledTimes(1);
  });

  it("rethrows the original 401 without refreshing when the token was cleared meanwhile", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    const gate = deferred<void>();
    const error = apiError(401);
    requestJsonMock.mockImplementation((_path, options) => {
      if (options?.token === "access-1") {
        return gate.promise.then(() => {
          throw error;
        });
      }

      return Promise.resolve({ ok: true });
    });

    const request = apiRequest("/items");

    await vi.waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledTimes(1);
    });

    clearAccessToken();
    gate.resolve();

    await expect(request).rejects.toBe(error);

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not notify a stale refresh failure when a newer token was installed", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    const gate = deferred<void>();
    refreshAccessTokenMock.mockImplementation(async () => {
      await gate.promise;
      throw apiError(503);
    });
    requestJsonMock.mockRejectedValue(apiError(401));

    const outcome = apiRequest("/items").then(
      () => null,
      (error: unknown) => error,
    );

    await vi.waitFor(() => {
      expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    });

    setAccessToken("access-login-new");
    gate.resolve();

    const error = await outcome;

    expect(error).toBeInstanceOf(AuthSessionError);

    if (error instanceof AuthSessionError) {
      expect(error.failure).toEqual({
        status: "connection-error",
        reason: "server",
      });
    }

    expect(listener).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("access-login-new");
  });

  it("does not notify a stale fallback login failure when a newer token was installed", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    const loginGate = deferred<void>();
    refreshAccessTokenMock.mockRejectedValue(apiError(401));
    loginFromTelegramMock.mockImplementation(async () => {
      await loginGate.promise;
      throw apiError(503);
    });
    requestJsonMock.mockRejectedValue(apiError(401));

    const outcome = apiRequest("/items").then(
      () => null,
      (error: unknown) => error,
    );

    await vi.waitFor(() => {
      expect(loginFromTelegramMock).toHaveBeenCalledTimes(1);
    });

    setAccessToken("access-login-new");
    loginGate.resolve();

    const error = await outcome;

    expect(error).toBeInstanceOf(AuthSessionError);

    if (error instanceof AuthSessionError) {
      expect(error.failure).toEqual({
        status: "connection-error",
        reason: "server",
      });
    }

    expect(listener).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("access-login-new");
  });

  it("does not notify a stale terminal failure when a newer token was installed", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    const finalGate = deferred<void>();
    mockRefreshSuccess("access-2");
    mockLoginSuccess("access-3");
    requestJsonMock.mockImplementation((_path, options) => {
      if (options?.token === "access-3") {
        return finalGate.promise.then(() => {
          throw apiError(401);
        });
      }

      return Promise.reject(apiError(401));
    });

    const outcome = apiRequest("/items").then(
      () => null,
      (error: unknown) => error,
    );

    await vi.waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledTimes(3);
    });

    setAccessToken("access-login-new");
    finalGate.resolve();

    const error = await outcome;

    expect(error).toMatchObject({ status: 401 });
    expect(listener).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("access-login-new");
  });
});

describe("apiRequest concurrency", () => {
  it("shares one refresh between simultaneous 401s and retries every request", async () => {
    setAccessToken("access-1");
    const gate = deferred<void>();
    refreshAccessTokenMock.mockImplementation(async () => {
      await gate.promise;
      setAccessToken("access-2");

      return tokenResponse;
    });
    requestJsonMock.mockImplementation((_path, options) => {
      if (options?.token === "access-1") {
        return Promise.reject(apiError(401));
      }

      return Promise.resolve({ ok: true });
    });

    const requests = [
      apiRequest("/a"),
      apiRequest("/b"),
      apiRequest("/c"),
    ];

    await vi.waitFor(() => {
      expect(refreshAccessTokenMock).toHaveBeenCalled();
    });

    gate.resolve();

    await expect(Promise.all(requests)).resolves.toEqual([
      { ok: true },
      { ok: true },
      { ok: true },
    ]);

    expect(requestJsonMock).toHaveBeenCalledTimes(6);
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(
      requestJsonMock.mock.calls.slice(3).map(([, options]) => options?.token),
    ).toEqual(["access-2", "access-2", "access-2"]);
  });

  it("shares one fallback login between simultaneous refresh 401s and retries every request", async () => {
    setAccessToken("access-1");
    const gate = deferred<void>();
    refreshAccessTokenMock.mockRejectedValue(apiError(401));
    loginFromTelegramMock.mockImplementation(async () => {
      await gate.promise;
      setAccessToken("access-login");

      return authResponse;
    });
    requestJsonMock.mockImplementation((_path, options) => {
      if (options?.token === "access-1") {
        return Promise.reject(apiError(401));
      }

      return Promise.resolve({ ok: true });
    });

    const requests = [
      apiRequest("/a"),
      apiRequest("/b"),
      apiRequest("/c"),
    ];

    await vi.waitFor(() => {
      expect(loginFromTelegramMock).toHaveBeenCalled();
    });

    gate.resolve();

    await expect(Promise.all(requests)).resolves.toEqual([
      { ok: true },
      { ok: true },
      { ok: true },
    ]);

    expect(loginFromTelegramMock).toHaveBeenCalledTimes(1);
    expect(
      requestJsonMock.mock.calls.slice(3).map(([, options]) => options?.token),
    ).toEqual(["access-login", "access-login", "access-login"]);
  });

  it("notifies once when simultaneous requests reach a terminal failure", async () => {
    setAccessToken("access-1");
    const listener = vi.fn<(failure: AuthFailure) => void>();
    setAuthFailureListener(listener);
    refreshAccessTokenMock.mockRejectedValue(apiError(500));
    requestJsonMock.mockRejectedValue(apiError(401));

    const results = await Promise.allSettled([
      apiRequest("/a"),
      apiRequest("/b"),
      apiRequest("/c"),
    ]);

    expect(results.every((result) => result.status === "rejected")).toBe(true);

    for (const result of results) {
      expect(result.status === "rejected" ? result.reason : null).toBeInstanceOf(
        AuthSessionError,
      );
    }

    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      status: "connection-error",
      reason: "server",
    });
  });
});
