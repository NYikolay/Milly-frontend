import { ApiError } from "~/lib/api/errors";
import type { AuthResponse, AuthUser, TokenResponse } from "~/lib/api/types";

import { classifyAuthFailure } from "./failure";
import type { AuthFailure, AuthFailureReason } from "./types";

export interface BootstrapAuthOptions {
  initData: string;
  login: (initData: string) => Promise<AuthResponse>;
  refresh: () => Promise<TokenResponse>;
  fetchMe: () => Promise<AuthUser>;
}

export type BootstrapAuthResult =
  | { status: "authenticated"; user: AuthUser }
  | { status: "connection-error"; reason: "network" | "server" }
  | { status: "reauth-required"; reason: AuthFailureReason }
  | { status: "no-init-data"; reason: "init_data_missing" };

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

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export async function bootstrapAuth(
  options: BootstrapAuthOptions,
): Promise<BootstrapAuthResult> {
  const { initData } = options;
  const loginAttempted = initData.trim() !== "";

  if (loginAttempted) {
    try {
      const response = await options.login(initData);

      return { status: "authenticated", user: response.user };
    } catch (error) {
      if (!isUnauthorized(error)) {
        return toBootstrapAuthResult(
          classifyAuthFailure(error, "session_expired"),
        );
      }
    }
  }

  try {
    await options.refresh();
  } catch (error) {
    if (isUnauthorized(error)) {
      return loginAttempted
        ? { status: "reauth-required", reason: "session_expired" }
        : { status: "no-init-data", reason: "init_data_missing" };
    }

    return toBootstrapAuthResult(classifyAuthFailure(error, "session_expired"));
  }

  try {
    const user = await options.fetchMe();

    return { status: "authenticated", user };
  } catch (error) {
    return toBootstrapAuthResult(classifyAuthFailure(error, "session_expired"));
  }
}
