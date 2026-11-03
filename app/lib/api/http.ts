import axios from "axios";

import { apiUrl, HTTP_REQUEST_TIMEOUT_MS } from "./config";
import { ApiError, ApiNetworkError } from "./errors";
import type { ApiErrorEnvelope } from "./types";

export interface HttpRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  timeoutMs?: number;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

function isCancelError(error: unknown): boolean {
  return (
    axios.isCancel(error) ||
    (typeof error === "object" &&
      error !== null &&
      (("name" in error && error.name === "CanceledError") ||
        ("code" in error && error.code === "ERR_CANCELED")))
  );
}

function isTimeoutError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED")
  );
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.error === true &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.request_id === "string"
  );
}

function readErrorEnvelope(text: string): ApiErrorEnvelope | null {
  if (text.trim() === "") {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(text);

    return isApiErrorEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toApiError(
  status: number,
  statusText: string,
  text: string,
): ApiError {
  const envelope = readErrorEnvelope(text);

  if (envelope) {
    return new ApiError(envelope.message, {
      status,
      code: envelope.code,
      requestId: envelope.request_id,
    });
  }

  return new ApiError(statusText || "Request failed", {
    status,
    code: "http_error",
    requestId: "",
  });
}

export async function requestJson<T>(
  path: string,
  options: HttpRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    token,
    signal,
    credentials = "include",
    timeoutMs,
  } = options;

  const requestTimeout =
    timeoutMs !== undefined && timeoutMs > 0
      ? timeoutMs
      : HTTP_REQUEST_TIMEOUT_MS;

  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Awaited<ReturnType<typeof axios.request<string>>>;

  try {
    response = await axios.request<string>({
      url: apiUrl(path),
      method,
      headers,
      withCredentials: credentials === "include",
      data: body === undefined ? undefined : JSON.stringify(body),
      signal,
      timeout: requestTimeout,
      responseType: "text",
      transformResponse: [(data) => data],
      validateStatus: () => true,
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new ApiNetworkError("Request timed out", { cause: error });
    }

    if (isCancelError(error)) {
      if (signal?.reason !== undefined) {
        throw signal.reason;
      }

      throw new DOMException("Aborted", "AbortError");
    }

    if (isAbortError(error)) {
      throw error;
    }

    throw new ApiNetworkError("Network request failed", { cause: error });
  }

  if (response.status < 200 || response.status >= 300) {
    throw toApiError(response.status, response.statusText, response.data);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = response.data;

  if (text.trim() === "") {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
