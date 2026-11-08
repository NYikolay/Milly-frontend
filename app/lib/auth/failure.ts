import { ApiError, ApiNetworkError } from "~/lib/api/errors";
import { isAbortError } from "~/lib/errors/async";

import { EmptyInitDataError } from "./errors";
import type { AuthFailure, AuthFailureReason } from "./types";

export { isAbortError };

export function classifyAuthFailure(
  error: unknown,
  unauthorizedReason: AuthFailureReason,
): AuthFailure {
  if (isAbortError(error)) {
    throw error;
  }

  if (error instanceof EmptyInitDataError) {
    return { status: "no-init-data", reason: "init_data_missing" };
  }

  if (error instanceof ApiNetworkError) {
    return { status: "connection-error", reason: "network" };
  }

  if (error instanceof ApiError) {
    if (error.status === 401) {
      return { status: "reauth-required", reason: unauthorizedReason };
    }

    if (error.status === 403) {
      return { status: "reauth-required", reason: "forbidden" };
    }

    if (error.status === 422) {
      return { status: "reauth-required", reason: "init_data_invalid" };
    }

    if (error.status >= 500) {
      return { status: "connection-error", reason: "server" };
    }

    return { status: "reauth-required", reason: "request_failed" };
  }

  return { status: "connection-error", reason: "server" };
}
