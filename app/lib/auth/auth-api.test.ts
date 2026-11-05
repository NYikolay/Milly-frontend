import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import type { HttpRequestOptions } from "~/lib/api/http";
import { requestJson } from "~/lib/api/http";
import type { AuthResponse, AuthUser, TokenResponse } from "~/lib/api/types";
import { getTelegramWebApp } from "~/lib/telegram/client";
import type { TelegramWebApp } from "~/lib/telegram/types";

import {
  fetchCurrentUser,
  loginFromTelegram,
  loginWithInitData,
  refreshAccessToken,
} from "./auth-api";
import { EmptyInitDataError } from "./errors";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./token-store";

vi.mock("~/lib/api/http", () => ({
  requestJson: vi.fn(),
}));

vi.mock("~/lib/telegram/client", () => ({
  getTelegramWebApp: vi.fn(),
}));

const requestJsonMock = vi.mocked(requestJson);
const getTelegramWebAppMock = vi.mocked(getTelegramWebApp);

const user: AuthUser = {
  id: 1,
  timezone: "UTC",
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

const authResponse: AuthResponse = {
  access_token: "access-1",
  token_type: "bearer",
  expires_in: 3600,
  user,
};

const tokenResponse: TokenResponse = {
  access_token: "access-2",
  token_type: "bearer",
  expires_in: 3600,
};

function apiError(status: number): ApiError {
  return new ApiError("request failed", {
    status,
    code: "test_error",
    requestId: "request-1",
  });
}

function requestOptions(callIndex = 0): HttpRequestOptions {
  const options = requestJsonMock.mock.calls[callIndex]?.[1];

  if (!options) {
    throw new Error("requestJson was not called with options");
  }

  return options;
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

function webAppWithInitData(initData: string): TelegramWebApp {
  return { initData } as TelegramWebApp;
}

beforeEach(() => {
  clearAccessToken();
  requestJsonMock.mockReset();
  getTelegramWebAppMock.mockReset();
});

describe("loginWithInitData", () => {
  it("posts init data without a bearer token and stores the access token", async () => {
    requestJsonMock.mockResolvedValue(authResponse);

    await expect(loginWithInitData("raw-init-data")).resolves.toEqual(
      authResponse,
    );

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(requestJsonMock.mock.calls[0]?.[0]).toBe("/auth/telegram");
    expect(requestOptions()).toEqual({
      method: "POST",
      body: { init_data: "raw-init-data" },
      credentials: "include",
    });
    expect(getAccessToken()).toBe("access-1");
  });

  it.each(["", "   ", "\n\t"])(
    "rejects %j with EmptyInitDataError before any HTTP request",
    async (initData) => {
      await expect(loginWithInitData(initData)).rejects.toBeInstanceOf(
        EmptyInitDataError,
      );

      expect(requestJsonMock).not.toHaveBeenCalled();
    },
  );

  it("shares one in-flight request between simultaneous calls", async () => {
    const gate = deferred<AuthResponse>();
    requestJsonMock.mockReturnValue(gate.promise);

    const first = loginWithInitData("same-init-data");
    const second = loginWithInitData("same-init-data");

    expect(requestJsonMock).toHaveBeenCalledTimes(1);

    gate.resolve(authResponse);

    await expect(first).resolves.toEqual(authResponse);
    await expect(second).resolves.toEqual(authResponse);
    expect(getAccessToken()).toBe("access-1");
  });

  it("clears the in-flight request after a failure", async () => {
    const error = apiError(500);
    requestJsonMock
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(authResponse);

    await expect(loginWithInitData("first-init-data")).rejects.toBe(error);
    await expect(loginWithInitData("second-init-data")).resolves.toEqual(
      authResponse,
    );

    expect(requestJsonMock).toHaveBeenCalledTimes(2);
  });

  it("forwards the abort signal and timeout to /auth/telegram", async () => {
    const controller = new AbortController();
    requestJsonMock.mockResolvedValue(authResponse);

    await expect(
      loginWithInitData("raw-init-data", {
        signal: controller.signal,
        timeoutMs: 1500,
      }),
    ).resolves.toEqual(authResponse);

    expect(requestOptions()).toEqual({
      method: "POST",
      body: { init_data: "raw-init-data" },
      credentials: "include",
      signal: controller.signal,
      timeoutMs: 1500,
    });
  });

  it("clears the in-flight slot when the request is aborted", async () => {
    const controller = new AbortController();
    const gate = deferred<AuthResponse>();

    requestJsonMock.mockImplementation((_path, options) => {
      options?.signal?.addEventListener(
        "abort",
        () => gate.reject(options.signal?.reason),
        { once: true },
      );

      return gate.promise;
    });

    const first = loginWithInitData("first-init-data", {
      signal: controller.signal,
      timeoutMs: 5000,
    });

    controller.abort();

    await expect(first).rejects.toMatchObject({ name: "AbortError" });

    requestJsonMock.mockResolvedValue(authResponse);

    await expect(loginWithInitData("second-init-data")).resolves.toEqual(
      authResponse,
    );

    expect(requestJsonMock).toHaveBeenCalledTimes(2);
  });

  it("does not store the access token when the request resolves after abort", async () => {
    const controller = new AbortController();
    const gate = deferred<AuthResponse>();
    requestJsonMock.mockReturnValue(gate.promise);

    const request = loginWithInitData("raw-init-data", {
      signal: controller.signal,
      timeoutMs: 5000,
    });

    controller.abort();
    gate.resolve(authResponse);

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(getAccessToken()).toBeNull();
  });
});

describe("refreshAccessToken", () => {
  it("posts to /auth/refresh and stores the new access token", async () => {
    setAccessToken("access-1");
    requestJsonMock.mockResolvedValue(tokenResponse);

    await expect(refreshAccessToken()).resolves.toEqual(tokenResponse);

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(requestJsonMock.mock.calls[0]?.[0]).toBe("/auth/refresh");
    expect(requestOptions()).toEqual({
      method: "POST",
      credentials: "include",
    });
    expect(getAccessToken()).toBe("access-2");
  });

  it("shares one in-flight request between simultaneous calls", async () => {
    const gate = deferred<TokenResponse>();
    requestJsonMock.mockReturnValue(gate.promise);

    const first = refreshAccessToken();
    const second = refreshAccessToken();

    expect(requestJsonMock).toHaveBeenCalledTimes(1);

    gate.resolve(tokenResponse);

    await expect(first).resolves.toEqual(tokenResponse);
    await expect(second).resolves.toEqual(tokenResponse);
    expect(getAccessToken()).toBe("access-2");
  });

  it("clears the access token on 401 and rethrows the error", async () => {
    setAccessToken("stale-access");
    const error = apiError(401);
    requestJsonMock.mockRejectedValue(error);

    await expect(refreshAccessToken()).rejects.toBe(error);

    expect(getAccessToken()).toBeNull();
  });

  it("keeps the access token on 500", async () => {
    setAccessToken("current-access");
    const error = apiError(500);
    requestJsonMock.mockRejectedValue(error);

    await expect(refreshAccessToken()).rejects.toBe(error);

    expect(getAccessToken()).toBe("current-access");
  });

  it("does not clear a newer token installed while the refresh was in flight", async () => {
    setAccessToken("stale-access");
    const gate = deferred<TokenResponse>();
    requestJsonMock.mockReturnValue(gate.promise);

    const refresh = refreshAccessToken();

    setAccessToken("access-from-fallback-login");
    gate.reject(apiError(401));

    await expect(refresh).rejects.toBeInstanceOf(ApiError);
    expect(getAccessToken()).toBe("access-from-fallback-login");
  });

  it("clears the in-flight request after a failure", async () => {
    const error = apiError(500);
    requestJsonMock
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(tokenResponse);

    await expect(refreshAccessToken()).rejects.toBe(error);
    await expect(refreshAccessToken()).resolves.toEqual(tokenResponse);

    expect(requestJsonMock).toHaveBeenCalledTimes(2);
  });

  it("forwards the abort signal and timeout to /auth/refresh", async () => {
    const controller = new AbortController();
    requestJsonMock.mockResolvedValue(tokenResponse);

    await expect(
      refreshAccessToken({
        signal: controller.signal,
        timeoutMs: 1500,
      }),
    ).resolves.toEqual(tokenResponse);

    expect(requestOptions()).toEqual({
      method: "POST",
      credentials: "include",
      signal: controller.signal,
      timeoutMs: 1500,
    });
  });

  it("clears the in-flight slot when the request is aborted", async () => {
    const controller = new AbortController();
    const gate = deferred<TokenResponse>();

    requestJsonMock.mockImplementation((_path, options) => {
      options?.signal?.addEventListener(
        "abort",
        () => gate.reject(options.signal?.reason),
        { once: true },
      );

      return gate.promise;
    });

    const first = refreshAccessToken({
      signal: controller.signal,
      timeoutMs: 5000,
    });

    controller.abort();

    await expect(first).rejects.toMatchObject({ name: "AbortError" });

    requestJsonMock.mockResolvedValue(tokenResponse);

    await expect(refreshAccessToken()).resolves.toEqual(tokenResponse);

    expect(requestJsonMock).toHaveBeenCalledTimes(2);
  });

  it("does not store the access token when the request resolves after abort", async () => {
    const controller = new AbortController();
    const gate = deferred<TokenResponse>();
    requestJsonMock.mockReturnValue(gate.promise);

    const request = refreshAccessToken({
      signal: controller.signal,
      timeoutMs: 5000,
    });

    controller.abort();
    gate.resolve(tokenResponse);

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(getAccessToken()).toBeNull();
  });
});

describe("fetchCurrentUser", () => {
  it("requests /auth/me with the current bearer token", async () => {
    setAccessToken("access-1");
    requestJsonMock.mockResolvedValue(user);

    await expect(fetchCurrentUser()).resolves.toEqual(user);

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(requestJsonMock.mock.calls[0]?.[0]).toBe("/auth/me");
    expect(requestOptions()).toEqual({
      method: "GET",
      token: "access-1",
    });
  });

  it("rejects with ApiError 401 without HTTP when there is no access token", async () => {
    try {
      await fetchCurrentUser();
      expect.unreachable("fetchCurrentUser should reject");
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }

      expect(error.status).toBe(401);
    }

    expect(requestJsonMock).not.toHaveBeenCalled();
  });

  it("does not refresh recursively when /auth/me returns 401", async () => {
    setAccessToken("stale-access");
    const error = apiError(401);
    requestJsonMock.mockRejectedValue(error);

    await expect(fetchCurrentUser()).rejects.toBe(error);

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(requestJsonMock.mock.calls[0]?.[0]).toBe("/auth/me");
    expect(getAccessToken()).toBe("stale-access");
  });

  it("forwards the abort signal and timeout to /auth/me", async () => {
    const controller = new AbortController();
    setAccessToken("access-1");
    requestJsonMock.mockResolvedValue(user);

    await expect(
      fetchCurrentUser({
        signal: controller.signal,
        timeoutMs: 1500,
      }),
    ).resolves.toEqual(user);

    expect(requestOptions()).toEqual({
      method: "GET",
      token: "access-1",
      signal: controller.signal,
      timeoutMs: 1500,
    });
  });
});

describe("loginFromTelegram", () => {
  it("logs in with initData from the Telegram WebApp", async () => {
    getTelegramWebAppMock.mockReturnValue(
      webAppWithInitData("telegram-init-data"),
    );
    requestJsonMock.mockResolvedValue(authResponse);

    await expect(loginFromTelegram()).resolves.toEqual(authResponse);

    expect(requestJsonMock).toHaveBeenCalledTimes(1);
    expect(requestOptions()).toEqual({
      method: "POST",
      body: { init_data: "telegram-init-data" },
      credentials: "include",
    });
    expect(getAccessToken()).toBe("access-1");
  });

  it("rejects with EmptyInitDataError when the WebApp or initData is missing", async () => {
    getTelegramWebAppMock.mockReturnValue(null);
    await expect(loginFromTelegram()).rejects.toBeInstanceOf(
      EmptyInitDataError,
    );

    getTelegramWebAppMock.mockReturnValue(webAppWithInitData(""));
    await expect(loginFromTelegram()).rejects.toBeInstanceOf(
      EmptyInitDataError,
    );

    expect(requestJsonMock).not.toHaveBeenCalled();
  });

  it("forwards the request options to the login request", async () => {
    const controller = new AbortController();
    getTelegramWebAppMock.mockReturnValue(
      webAppWithInitData("telegram-init-data"),
    );
    requestJsonMock.mockResolvedValue(authResponse);

    await expect(
      loginFromTelegram({ signal: controller.signal, timeoutMs: 2000 }),
    ).resolves.toEqual(authResponse);

    expect(requestOptions()).toEqual({
      method: "POST",
      body: { init_data: "telegram-init-data" },
      credentials: "include",
      signal: controller.signal,
      timeoutMs: 2000,
    });
  });
});
