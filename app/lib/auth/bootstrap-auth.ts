import { HTTP_REQUEST_TIMEOUT_MS } from "~/lib/api/config";
import { ApiError } from "~/lib/api/errors";
import type { AuthResponse, AuthUser, TokenResponse } from "~/lib/api/types";

import { classifyAuthFailure, isAbortError } from "./failure";
import type { BootstrapRequestOptions } from "./timeouts";
import type { AuthFailure, AuthFailureReason } from "./types";

export type { BootstrapRequestOptions } from "./timeouts";

const TIMEZONE_SYNC_TIMEOUT_MS = 3000;

export interface BootstrapAuthOptions {
  initData: string;
  budgetMs: number;
  requestTimeoutMs?: number;
  timeZone?: string;
  login: (
    initData: string,
    options: BootstrapRequestOptions,
  ) => Promise<AuthResponse>;
  refresh: (options: BootstrapRequestOptions) => Promise<TokenResponse>;
  fetchMe: (options: BootstrapRequestOptions) => Promise<AuthUser>;
  updateTimezone?: (
    timezone: string,
    options: BootstrapRequestOptions,
  ) => Promise<AuthUser>;
}

export type BootstrapAuthResult =
  | { status: "authenticated"; user: AuthUser }
  | { status: "connection-error"; reason: "network" | "server" }
  | { status: "reauth-required"; reason: AuthFailureReason }
  | { status: "no-init-data"; reason: "init_data_missing" };

class BootstrapBudgetError extends Error {
  constructor() {
    super("Bootstrap budget exceeded");
    this.name = "BootstrapBudgetError";
  }
}

function toBootstrapAuthResult(failure: AuthFailure): BootstrapAuthResult {
  switch (failure.status) {
    case "connection-error":
      return {
        status: "connection-error",
        reason: failure.reason === "network" ? "network" : "server",
      };
    case "reauth-required":
      return { status: "reauth-required", reason: failure.reason };
    case "no-init-data":
      return { status: "no-init-data", reason: "init_data_missing" };
  }
}

function toResult(
  error: unknown,
  unauthorizedReason: AuthFailureReason,
): BootstrapAuthResult {
  if (error instanceof BootstrapBudgetError) {
    return { status: "connection-error", reason: "network" };
  }

  return toBootstrapAuthResult(
    classifyAuthFailure(error, unauthorizedReason),
  );
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export async function bootstrapAuth(
  options: BootstrapAuthOptions,
): Promise<BootstrapAuthResult> {
  const { budgetMs } = options;

  if (budgetMs <= 0) {
    return { status: "connection-error", reason: "network" };
  }

  const { initData } = options;
  const loginAttempted = initData.trim() !== "";
  const deadline = Date.now() + budgetMs;
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const requestOptions = (): BootstrapRequestOptions => {
    const remaining = deadline - Date.now();

    if (remaining <= 0) {
      throw new BootstrapBudgetError();
    }

    return {
      signal: controller.signal,
      timeoutMs: Math.min(
        options.requestTimeoutMs ?? HTTP_REQUEST_TIMEOUT_MS,
        Math.max(1, remaining),
      ),
    };
  };

  const syncRequestOptions = (): BootstrapRequestOptions => {
    const request = requestOptions();

    return {
      ...request,
      timeoutMs: Math.min(
        request.timeoutMs ?? TIMEZONE_SYNC_TIMEOUT_MS,
        TIMEZONE_SYNC_TIMEOUT_MS,
      ),
    };
  };

  const syncTimeZone = async (user: AuthUser): Promise<AuthUser> => {
    const { timeZone, updateTimezone } = options;

    if (!timeZone || !updateTimezone || timeZone === user.timezone) {
      return user;
    }

    if (deadline - Date.now() <= TIMEZONE_SYNC_TIMEOUT_MS) {
      return user;
    }

    try {
      return await updateTimezone(timeZone, syncRequestOptions());
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      return user;
    }
  };

  const workflow = async (): Promise<BootstrapAuthResult> => {
    if (loginAttempted) {
      try {
        const response = await options.login(initData, requestOptions());

        return {
          status: "authenticated",
          user: await syncTimeZone(response.user),
        };
      } catch (error) {
        if (!isUnauthorized(error)) {
          return toResult(error, "session_expired");
        }
      }
    }

    try {
      await options.refresh(requestOptions());
    } catch (error) {
      if (isUnauthorized(error)) {
        return loginAttempted
          ? { status: "reauth-required", reason: "session_expired" }
          : { status: "no-init-data", reason: "init_data_missing" };
      }

      return toResult(error, "session_expired");
    }

    try {
      const user = await options.fetchMe(requestOptions());

      return { status: "authenticated", user: await syncTimeZone(user) };
    } catch (error) {
      return toResult(error, "session_expired");
    }
  };

  const budget = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new BootstrapBudgetError());
    }, budgetMs);
  });

  try {
    return await Promise.race([workflow(), budget]);
  } catch (error) {
    if (timedOut || error instanceof BootstrapBudgetError) {
      return { status: "connection-error", reason: "network" };
    }

    if (isAbortError(error)) {
      throw error;
    }

    return toResult(error, "session_expired");
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
