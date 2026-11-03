import { ApiError } from "~/lib/api/errors";
import { requestJson } from "~/lib/api/http";
import type { AuthResponse, AuthUser, TokenResponse } from "~/lib/api/types";
import { getTelegramWebApp } from "~/lib/telegram/client";

import { EmptyInitDataError } from "./errors";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./token-store";

export interface AuthRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

let loginInFlight: Promise<AuthResponse> | null = null;
let refreshInFlight: Promise<TokenResponse> | null = null;

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("Aborted", "AbortError");
}

export function loginWithInitData(
  initData: string,
  options?: AuthRequestOptions,
): Promise<AuthResponse> {
  if (initData.trim() === "") {
    return Promise.reject(new EmptyInitDataError());
  }

  if (loginInFlight) {
    return loginInFlight;
  }

  let request!: Promise<AuthResponse>;

  const handleAbort = () => {
    if (loginInFlight === request) {
      loginInFlight = null;
    }
  };

  request = (async () => {
    try {
      const response = await requestJson<AuthResponse>("/auth/telegram", {
        method: "POST",
        body: { init_data: initData },
        credentials: "include",
        signal: options?.signal,
        timeoutMs: options?.timeoutMs,
      });

      if (options?.signal?.aborted) {
        throw abortReason(options.signal);
      }

      setAccessToken(response.access_token);

      return response;
    } finally {
      options?.signal?.removeEventListener("abort", handleAbort);

      if (loginInFlight === request) {
        loginInFlight = null;
      }
    }
  })();

  loginInFlight = request;
  options?.signal?.addEventListener("abort", handleAbort, { once: true });

  return request;
}

export function refreshAccessToken(
  options?: AuthRequestOptions,
): Promise<TokenResponse> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const tokenAtStart = getAccessToken();

  let request!: Promise<TokenResponse>;

  const handleAbort = () => {
    if (refreshInFlight === request) {
      refreshInFlight = null;
    }
  };

  request = (async () => {
    try {
      const response = await requestJson<TokenResponse>("/auth/refresh", {
        method: "POST",
        credentials: "include",
        signal: options?.signal,
        timeoutMs: options?.timeoutMs,
      });

      if (options?.signal?.aborted) {
        throw abortReason(options.signal);
      }

      setAccessToken(response.access_token);

      return response;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        getAccessToken() === tokenAtStart
      ) {
        clearAccessToken();
      }

      throw error;
    } finally {
      options?.signal?.removeEventListener("abort", handleAbort);

      if (refreshInFlight === request) {
        refreshInFlight = null;
      }
    }
  })();

  refreshInFlight = request;
  options?.signal?.addEventListener("abort", handleAbort, { once: true });

  return request;
}

export function fetchCurrentUser(
  options?: AuthRequestOptions,
): Promise<AuthUser> {
  const token = getAccessToken();

  if (!token) {
    return Promise.reject(
      new ApiError("Access token is missing", {
        status: 401,
        code: "unauthorized",
        requestId: "",
      }),
    );
  }

  return requestJson<AuthUser>("/auth/me", {
    method: "GET",
    token,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
  });
}

export function loginFromTelegram(
  options?: AuthRequestOptions,
): Promise<AuthResponse> {
  return loginWithInitData(getTelegramWebApp()?.initData ?? "", options);
}
