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

function failSession(
  failure: AuthFailure,
  sessionToken: string | null,
): never {
  if (getAccessToken() !== sessionToken) {
    throw new AuthSessionError(failure);
  }

  notifyAuthFailure(failure);
  throw new AuthSessionError(failure);
}

async function fallbackLogin<T>(request: NormalizedRequest): Promise<T> {
  const tokenBeforeLogin = getAccessToken();

  try {
    await loginSession();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    failSession(
      classifyAuthFailure(error, "init_data_invalid"),
      tokenBeforeLogin,
    );
  }

  const finalToken = getAccessToken();

  try {
    return await send<T>(request, finalToken);
  } catch (error) {
    if (isAbortError(error) || !isUnauthorized(error)) {
      throw error;
    }

    if (getAccessToken() !== finalToken) {
      throw error;
    }

    failSession(
      { status: "reauth-required", reason: "session_expired" },
      finalToken,
    );
  }
}

async function retryAfterTokenChange<T>(
  request: NormalizedRequest,
  currentToken: string,
): Promise<T> {
  try {
    return await send<T>(request, currentToken);
  } catch (error) {
    if (isAbortError(error) || !isUnauthorized(error)) {
      throw error;
    }
  }

  return fallbackLogin<T>(request);
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

  const usedToken = getAccessToken();

  try {
    return await send<T>(request, usedToken);
  } catch (error) {
    if (isAbortError(error) || !isUnauthorized(error)) {
      throw error;
    }

    const currentToken = getAccessToken();

    if (currentToken !== usedToken) {
      if (currentToken === null) {
        throw error;
      }

      return retryAfterTokenChange<T>(request, currentToken);
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
      failSession(classifyAuthFailure(error, "session_expired"), usedToken);
    }
  }

  if (refreshed) {
    const retryToken = getAccessToken();

    try {
      return await send<T>(request, retryToken);
    } catch (error) {
      if (isAbortError(error) || !isUnauthorized(error)) {
        throw error;
      }
    }
  }

  return fallbackLogin<T>(request);
}
