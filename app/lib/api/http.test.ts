import axios, { AxiosHeaders } from "axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_BASE_URL, HTTP_REQUEST_TIMEOUT_MS } from "./config";
import { ApiError, ApiNetworkError } from "./errors";
import { requestJson } from "./http";

function spyOnRequest() {
  return vi.spyOn(axios, "request");
}

let requestSpy: ReturnType<typeof spyOnRequest>;

beforeEach(() => {
  requestSpy = spyOnRequest();
});

afterEach(() => {
  requestSpy.mockRestore();
});

function response(
  data: string,
  init: { status?: number; statusText?: string } = {},
): AxiosResponse<string> {
  return {
    data,
    status: init.status ?? 200,
    statusText: init.statusText ?? "",
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

function jsonResponse(
  body: unknown,
  init?: { status?: number; statusText?: string },
): AxiosResponse<string> {
  return response(JSON.stringify(body), init);
}

function requestConfig(callIndex = 0): AxiosRequestConfig {
  const config = requestSpy.mock.calls[callIndex]?.[0];

  if (!config) {
    throw new Error("axios.request was not called");
  }

  return config;
}

describe("requestJson", () => {
  it("requests the configured API URL with credentials include by default", async () => {
    requestSpy.mockResolvedValue(jsonResponse({ ok: true }));

    const result = await requestJson<{ ok: boolean }>("/auth/me");

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestConfig().url).toBe(`${API_BASE_URL}/auth/me`);
    expect(requestConfig().method).toBe("GET");
    expect(requestConfig().withCredentials).toBe(true);
    expect(requestConfig().headers?.["Content-Type"]).toBeUndefined();
    expect(requestConfig().data).toBeUndefined();
    expect(result).toEqual({ ok: true });
  });

  it("keeps raw text responses and validates every status through ApiError", async () => {
    requestSpy.mockResolvedValue(jsonResponse({ ok: true }));

    await requestJson("/auth/me");

    const transformers = requestConfig().transformResponse;

    expect(Array.isArray(transformers)).toBe(true);
    expect(
      (transformers as Array<(data: unknown) => unknown>)[0]?.("raw"),
    ).toBe("raw");
    expect(requestConfig().responseType).toBe("text");
    expect(requestConfig().validateStatus?.(500)).toBe(true);
  });

  it("serializes the body as JSON and sets Content-Type", async () => {
    requestSpy.mockResolvedValue(jsonResponse({}));

    await requestJson("/auth/telegram", {
      method: "POST",
      body: { init_data: "raw-init-data" },
    });

    expect(requestConfig().method).toBe("POST");
    expect(requestConfig().data).toBe(
      JSON.stringify({ init_data: "raw-init-data" }),
    );
    expect(requestConfig().headers?.["Content-Type"]).toBe("application/json");
  });

  it("adds Authorization only when the token is non-empty", async () => {
    requestSpy
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}));

    await requestJson("/auth/me", { token: "access-token" });
    await requestJson("/auth/me", { token: "" });

    expect(requestConfig(0).headers?.Authorization).toBe("Bearer access-token");
    expect(requestConfig(1).headers?.Authorization).toBeUndefined();
  });

  it("does not add Authorization when the token is null", async () => {
    requestSpy.mockResolvedValue(jsonResponse({}));

    await requestJson("/auth/me", { token: null });

    expect(requestConfig().headers?.Authorization).toBeUndefined();
  });

  it("forwards the abort signal to axios", async () => {
    requestSpy.mockResolvedValue(jsonResponse({}));
    const controller = new AbortController();

    await requestJson("/auth/me", { signal: controller.signal });

    expect(requestConfig().signal).toBe(controller.signal);
  });

  it("uses the default request timeout", async () => {
    requestSpy.mockResolvedValue(jsonResponse({}));

    await requestJson("/auth/me");

    expect(HTTP_REQUEST_TIMEOUT_MS).toBe(10000);
    expect(requestConfig().timeout).toBe(HTTP_REQUEST_TIMEOUT_MS);
  });

  it("overrides the request timeout when timeoutMs is positive", async () => {
    requestSpy.mockResolvedValue(jsonResponse({}));

    await requestJson("/auth/me", { timeoutMs: 1500 });

    expect(requestConfig().timeout).toBe(1500);
  });

  it("falls back to the default timeout for non-positive timeoutMs", async () => {
    requestSpy
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse({}));

    await requestJson("/auth/me", { timeoutMs: 0 });
    await requestJson("/auth/me", { timeoutMs: -1 });

    expect(requestConfig(0).timeout).toBe(10000);
    expect(requestConfig(1).timeout).toBe(10000);
  });

  it("returns parsed JSON for a successful response", async () => {
    requestSpy.mockResolvedValue(jsonResponse({ id: 1, name: "Milly" }));

    await expect(requestJson("/auth/me")).resolves.toEqual({
      id: 1,
      name: "Milly",
    });
  });

  it("returns undefined for 204", async () => {
    requestSpy.mockResolvedValue(response("", { status: 204 }));

    await expect(
      requestJson("/auth/logout", { method: "POST" }),
    ).resolves.toBeUndefined();
  });

  it("returns undefined for an empty successful body", async () => {
    requestSpy.mockResolvedValue(response("", { status: 200 }));

    await expect(requestJson("/auth/me")).resolves.toBeUndefined();
  });

  it("throws ApiError with status, code and requestId from an error envelope", async () => {
    requestSpy.mockResolvedValue(
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
      expect(error.description).toBe("Signature check failed");
    }
  });

  it("falls back to http_error when an error envelope description is not a string", async () => {
    requestSpy.mockResolvedValue(
      jsonResponse(
        {
          error: true,
          code: "init_data_invalid",
          message: "Init data is invalid",
          description: null,
          details: null,
          request_id: "request-1",
        },
        { status: 422, statusText: "Unprocessable Entity" },
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

      expect(error.status).toBe(422);
      expect(error.code).toBe("http_error");
      expect(error.requestId).toBe("");
      expect(error.message).toBe("Unprocessable Entity");
      expect(error.description).toBe("");
    }
  });

  it("throws ApiError with http_error when a non-2xx response has no JSON", async () => {
    requestSpy.mockResolvedValue(
      response("Bad gateway", { status: 502, statusText: "Bad Gateway" }),
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
      expect(error.message).toBe("Bad Gateway");
    }
  });

  it("throws ApiNetworkError when axios rejects", async () => {
    const cause = new TypeError("fetch failed");
    requestSpy.mockRejectedValue(cause);

    try {
      await requestJson("/auth/me");
      expect.unreachable("requestJson should reject");
    } catch (error) {
      if (!(error instanceof ApiNetworkError)) {
        throw error;
      }

      expect(error.message).toBe("Network request failed");
      expect(error.cause).toBe(cause);
    }
  });

  it.each(["ECONNABORTED", "ETIMEDOUT"] as const)(
    "maps axios %s to a timeout ApiNetworkError",
    async (code) => {
      const cause = new axios.AxiosError("timeout exceeded", code);
      requestSpy.mockRejectedValue(cause);

      try {
        await requestJson("/auth/me");
        expect.unreachable("requestJson should reject");
      } catch (error) {
        if (!(error instanceof ApiNetworkError)) {
          throw error;
        }

        expect(error.message).toBe("Request timed out");
        expect(error.cause).toBe(cause);
      }
    },
  );

  it("rethrows AbortError unchanged", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    requestSpy.mockRejectedValue(abortError);
    const controller = new AbortController();

    try {
      await requestJson("/auth/me", { signal: controller.signal });
      expect.unreachable("requestJson should reject");
    } catch (error) {
      expect(error).toBe(abortError);
    }
  });

  it("maps axios cancellation to the abort signal reason", async () => {
    const reason = new DOMException("Aborted", "AbortError");
    const controller = new AbortController();
    controller.abort(reason);
    requestSpy.mockRejectedValue(new axios.CanceledError());

    await expect(
      requestJson("/auth/me", { signal: controller.signal }),
    ).rejects.toBe(reason);
  });

  it("maps axios cancellation to AbortError when the signal has no reason", async () => {
    requestSpy.mockRejectedValue(new axios.CanceledError());

    await expect(requestJson("/auth/me")).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
