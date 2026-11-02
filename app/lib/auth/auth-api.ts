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

let loginInFlight: Promise<AuthResponse> | null = null;
let refreshInFlight: Promise<TokenResponse> | null = null;

export function loginWithInitData(initData: string): Promise<AuthResponse> {
  if (initData.trim() === "") {
    return Promise.reject(new EmptyInitDataError());
  }

  if (loginInFlight) {
    return loginInFlight;
  }

  const request = (async () => {
    try {
      const response = await requestJson<AuthResponse>("/auth/telegram", {
        method: "POST",
        body: { init_data: initData },
        credentials: "include",
      });

      setAccessToken(response.access_token);

      return response;
    } finally {
      loginInFlight = null;
    }
  })();

  loginInFlight = request;

  return request;
}

export function refreshAccessToken(): Promise<TokenResponse> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const request = (async () => {
    try {
      const response = await requestJson<TokenResponse>("/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      setAccessToken(response.access_token);

      return response;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAccessToken();
      }

      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();

  refreshInFlight = request;

  return request;
}

export function fetchCurrentUser(): Promise<AuthUser> {
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

  return requestJson<AuthUser>("/auth/me", { method: "GET", token });
}

export function loginFromTelegram(): Promise<AuthResponse> {
  return loginWithInitData(getTelegramWebApp()?.initData ?? "");
}
