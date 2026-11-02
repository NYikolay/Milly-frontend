import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_BASE_URL } from "./config";
import { ApiError, ApiNetworkError } from "./errors";
import { requestJson } from "./http";

type FetchFunction = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const fetchMock = vi.fn<FetchFunction>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function requestInit(callIndex = 0): RequestInit {
  const init = fetchMock.mock.calls[callIndex]?.[1];

  if (!init) {
    throw new Error("fetch was not called");
  }

  return init;
}

function requestHeaders(callIndex = 0): Headers {
  return new Headers(requestInit(callIndex).headers);
}

describe("requestJson", () => {
  it("requests the configured API URL with credentials include by default", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    const result = await requestJson<{ ok: boolean }>("/auth/me");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_BASE_URL}/auth/me`);
    expect(requestInit().method).toBe("GET");
    expect(requestInit().credentials).toBe("include");
    expect(requestHeaders().get("content-type")).toBeNull();
    expect(result).toEqual({ ok: true });
  });

  it("serializes the body as JSON and sets Content-Type", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await requestJson("/auth/telegram", {
      method: "POST",
      body: { init_data: "raw-init-data" },
    });

    expect(requestInit().method).toBe("POST");
    expect(requestInit().body).toBe(
      JSON.stringify({ init_data: "raw-init-data" }),
    );
    expect(requestHeaders().get("content-type")).toBe("application/json");
  });

  it("adds Authorization only when the token is non-empty", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}));

    await requestJson("/auth/me", { token: "access-token" });
    await requestJson("/auth/me", { token: "" });

    expect(requestHeaders(0).get("authorization")).toBe(
      "Bearer access-token",
    );
    expect(requestHeaders(1).get("authorization")).toBeNull();
  });

  it("does not add Authorization when the token is null", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await requestJson("/auth/me", { token: null });

    expect(requestHeaders().get("authorization")).toBeNull();
  });

  it("returns parsed JSON for a successful response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, name: "Milly" }));

    await expect(requestJson("/auth/me")).resolves.toEqual({
      id: 1,
      name: "Milly",
    });
  });

  it("returns undefined for 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      requestJson("/auth/logout", { method: "POST" }),
    ).resolves.toBeUndefined();
  });

  it("returns undefined for an empty successful body", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 200 }));

    await expect(requestJson("/auth/me")).resolves.toBeUndefined();
  });

  it("throws ApiError with status, code and requestId from an error envelope", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: true,
          code: "init_data_invalid",
          message: "Init data is invalid",
          description: "Signature check failed",
          details: null,
          request_id: "request-1",
        },
        { status: 401 },
      ),
    );

    try {
      await requestJson("/auth/telegram", {
        method: "POST",
        body: { init_data: "bad" },
      });
      expect.unreachable("requestJson should reject");
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }

      expect(error.status).toBe(401);
      expect(error.code).toBe("init_data_invalid");
      expect(error.requestId).toBe("request-1");
      expect(error.message).toBe("Init data is invalid");
    }
  });

  it("throws ApiError with http_error when a non-2xx response has no JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("Bad gateway", {
        status: 502,
        statusText: "Bad Gateway",
      }),
    );

    try {
      await requestJson("/auth/me");
      expect.unreachable("requestJson should reject");
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }

      expect(error.status).toBe(502);
      expect(error.code).toBe("http_error");
      expect(error.requestId).toBe("");
    }
  });

  it("throws ApiNetworkError when fetch rejects", async () => {
    const cause = new TypeError("fetch failed");
    fetchMock.mockRejectedValue(cause);

    try {
      await requestJson("/auth/me");
      expect.unreachable("requestJson should reject");
    } catch (error) {
      if (!(error instanceof ApiNetworkError)) {
        throw error;
      }

      expect(error.cause).toBe(cause);
    }
  });

  it("rethrows AbortError unchanged", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    fetchMock.mockRejectedValue(abortError);
    const controller = new AbortController();

    try {
      await requestJson("/auth/me", { signal: controller.signal });
      expect.unreachable("requestJson should reject");
    } catch (error) {
      expect(error).toBe(abortError);
    }
  });
});
