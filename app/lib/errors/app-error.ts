import { isRouteErrorResponse } from "react-router";

import { ApiError, ApiNetworkError } from "~/lib/api/errors";

export type AppErrorKind = "not-found" | "rate-limited" | "server";

export interface AppErrorDescriptor {
  kind: AppErrorKind;
  status: number | null;
  requestId: string | null;
}

export interface AppErrorPayload {
  appError: AppErrorDescriptor;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAppErrorKind(value: unknown): value is AppErrorKind {
  return value === "not-found" || value === "rate-limited" || value === "server";
}

function normalizeRequestId(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function readRouteRequestId(data: unknown): string | null {
  if (!isRecord(data)) {
    return null;
  }

  if (isAppErrorPayload(data)) {
    return normalizeRequestId(data.appError.requestId);
  }

  if (typeof data.requestId === "string") {
    return normalizeRequestId(data.requestId);
  }

  return normalizeRequestId(data.request_id);
}

function kindForStatus(status: number): AppErrorKind {
  if (status === 404) {
    return "not-found";
  }

  if (status === 429) {
    return "rate-limited";
  }

  return "server";
}

export function isAppErrorPayload(value: unknown): value is AppErrorPayload {
  if (!isRecord(value) || !isRecord(value.appError)) {
    return false;
  }

  const { kind, status, requestId } = value.appError;

  return (
    isAppErrorKind(kind) &&
    (typeof status === "number" || status === null) &&
    (typeof requestId === "string" || requestId === null)
  );
}

export function classifyAppError(error: unknown): AppErrorDescriptor {
  if (isRouteErrorResponse(error)) {
    return {
      kind: kindForStatus(error.status),
      status: error.status,
      requestId: readRouteRequestId(error.data),
    };
  }

  if (error instanceof ApiError) {
    return {
      kind: kindForStatus(error.status),
      status: error.status,
      requestId: normalizeRequestId(error.requestId),
    };
  }

  if (error instanceof ApiNetworkError) {
    return { kind: "server", status: null, requestId: null };
  }

  return { kind: "server", status: null, requestId: null };
}

export function shouldReloadOnRetry(error: unknown): boolean {
  return !(
    isRouteErrorResponse(error) ||
    error instanceof ApiError ||
    error instanceof ApiNetworkError
  );
}
