import {
  loginFromTelegram,
  refreshAccessToken,
} from "~/lib/auth/auth-api";
import { notifyAuthFailure } from "~/lib/auth/auth-events";
import { AuthSessionError } from "~/lib/auth/errors";
import {
  classifyAuthFailure,
  isAbortError,
} from "~/lib/auth/failure";
import { getAccessToken } from "~/lib/auth/token-store";
import type { AuthFailure } from "~/lib/auth/types";

import { ApiError } from "./errors";
import { requestJson } from "./http";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

interface NormalizedRequest {
  path: string;
  method: NonNullable<ApiRequestOptions["method"]>;
  body?: unknown;
  signal?: AbortSignal;
}

let refreshInFlight: Promise<void> | null = null;
let loginInFlight: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const request = (async () => {
    try {
      await refreshAccessToken();
    } finally {
      refreshInFlight = null;
    }
  })();

  refreshInFlight = request;

  return request;
}

function loginSession(): Promise<void> {
  if (loginInFlight) {
    return loginInFlight;
  }

  const request = (async () => {
    try {
      await loginFromTelegram();
    } finally {
      loginInFlight = null;
    }
  })();

  loginInFlight = request;

  return request;
}

function send<T>(
  request: NormalizedRequest,
  token: string | null,
): Promise<T> {
  return requestJson<T>(request.path, {
    method: request.method,
    body: request.body,
    signal: request.signal,
    ...(token === null ? {} : { token }),
  });
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function failSession(failure: AuthFailure): never {
  notifyAuthFailure(failure);
  throw new AuthSessionError(failure);
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    signal,
    auth = true,
    retryOnUnauthorized = true,
  } = options;

  const request: NormalizedRequest = { path, method, body, signal };

  if (!auth) {
    return send<T>(request, null);
  }

  if (!retryOnUnauthorized) {
    return send<T>(request, getAccessToken());
  }

  try {
    return await send<T>(request, getAccessToken());
  } catch (error) {
    if (isAbortError(error) || !isUnauthorized(error)) {
      throw error;
    }
  }

  let refreshed = false;

  try {
    await refreshSession();
    refreshed = true;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (!isUnauthorized(error)) {
      failSession(classifyAuthFailure(error, "session_expired"));
    }
  }

  if (refreshed) {
    try {
      return await send<T>(request, getAccessToken());
    } catch (error) {
      if (isAbortError(error) || !isUnauthorized(error)) {
        throw error;
      }
    }
  }

  try {
    await loginSession();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    failSession(classifyAuthFailure(error, "init_data_invalid"));
  }

  try {
    return await send<T>(request, getAccessToken());
  } catch (error) {
    if (isAbortError(error) || !isUnauthorized(error)) {
      throw error;
    }

    failSession({ status: "reauth-required", reason: "session_expired" });
  }
}
