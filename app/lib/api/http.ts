import { apiUrl } from "./config";
import { ApiError, ApiNetworkError } from "./errors";
import type { ApiErrorEnvelope } from "./types";

export interface HttpRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
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

async function readErrorEnvelope(
  response: Response,
): Promise<ApiErrorEnvelope | null> {
  let text: string;

  try {
    text = await response.text();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return null;
  }

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

async function toApiError(response: Response): Promise<ApiError> {
  const envelope = await readErrorEnvelope(response);

  if (envelope) {
    return new ApiError(envelope.message, {
      status: response.status,
      code: envelope.code,
      requestId: envelope.request_id,
    });
  }

  return new ApiError(response.statusText || "Request failed", {
    status: response.status,
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
  } = options;

  const headers = new Headers();

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      credentials,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new ApiNetworkError("Network request failed", { cause: error });
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (text.trim() === "") {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
