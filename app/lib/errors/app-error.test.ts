import { describe, expect, it } from "vitest";

import { ApiError, ApiNetworkError } from "~/lib/api/errors";

import {
  classifyAppError,
  isAppErrorPayload,
  shouldReloadOnRetry,
} from "./app-error";

function routeError(status: number, data: unknown = null): unknown {
  return { status, statusText: "", internal: false, data };
}

function apiError(status: number, requestId = "request-1"): ApiError {
  return new ApiError("request failed", {
    status,
    code: "test_error",
    requestId,
  });
}

describe("classifyAppError", () => {
  it("classifies route error 404 as not-found", () => {
    expect(classifyAppError(routeError(404))).toEqual({
      kind: "not-found",
      status: 404,
      requestId: null,
    });
  });

  it("classifies route error 429 as rate-limited", () => {
    expect(classifyAppError(routeError(429))).toEqual({
      kind: "rate-limited",
      status: 429,
      requestId: null,
    });
  });

  it.each([500, 503])("classifies route error %i as server", (status) => {
    expect(classifyAppError(routeError(status))).toEqual({
      kind: "server",
      status,
      requestId: null,
    });
  });

  it("reads requestId from a valid appError payload", () => {
    expect(
      classifyAppError(
        routeError(429, {
          appError: {
            kind: "rate-limited",
            status: 429,
            requestId: "req-1",
          },
        }),
      ),
    ).toEqual({ kind: "rate-limited", status: 429, requestId: "req-1" });
  });

  it("falls back to request_id in route error data", () => {
    expect(classifyAppError(routeError(500, { request_id: "req-2" }))).toEqual({
      kind: "server",
      status: 500,
      requestId: "req-2",
    });
  });

  it("falls back to requestId in route error data", () => {
    expect(classifyAppError(routeError(500, { requestId: "req-4" }))).toEqual({
      kind: "server",
      status: 500,
      requestId: "req-4",
    });
  });

  it("ignores a malformed appError payload when reading requestId", () => {
    expect(
      classifyAppError(
        routeError(500, {
          appError: { kind: "unknown" },
          request_id: "req-5",
        }),
      ),
    ).toEqual({ kind: "server", status: 500, requestId: "req-5" });
  });

  it("normalizes an empty route error requestId to null", () => {
    expect(classifyAppError(routeError(500, { request_id: "" }))).toEqual({
      kind: "server",
      status: 500,
      requestId: null,
    });
  });

  it("classifies ApiError 404 as not-found with its requestId", () => {
    expect(classifyAppError(apiError(404, "req-3"))).toEqual({
      kind: "not-found",
      status: 404,
      requestId: "req-3",
    });
  });

  it("classifies ApiError 429 as rate-limited", () => {
    expect(classifyAppError(apiError(429))).toEqual({
      kind: "rate-limited",
      status: 429,
      requestId: "request-1",
    });
  });

  it.each([500, 503])("classifies ApiError %i as server", (status) => {
    expect(classifyAppError(apiError(status))).toEqual({
      kind: "server",
      status,
      requestId: "request-1",
    });
  });

  it("classifies other ApiError statuses as server with the status", () => {
    expect(classifyAppError(apiError(422))).toEqual({
      kind: "server",
      status: 422,
      requestId: "request-1",
    });
  });

  it("normalizes an empty ApiError requestId to null", () => {
    expect(classifyAppError(apiError(500, ""))).toEqual({
      kind: "server",
      status: 500,
      requestId: null,
    });
  });

  it("classifies ApiNetworkError as server with a null status", () => {
    expect(classifyAppError(new ApiNetworkError("offline"))).toEqual({
      kind: "server",
      status: null,
      requestId: null,
    });
  });

  it.each([new Error("boom"), "boom", null, undefined])(
    "classifies unknown values as server with a null status",
    (error) => {
      expect(classifyAppError(error)).toEqual({
        kind: "server",
        status: null,
        requestId: null,
      });
    },
  );
});

describe("shouldReloadOnRetry", () => {
  it("returns false for route error responses", () => {
    expect(shouldReloadOnRetry(routeError(500))).toBe(false);
  });

  it("returns false for ApiError", () => {
    expect(shouldReloadOnRetry(apiError(500))).toBe(false);
  });

  it("returns false for ApiNetworkError", () => {
    expect(shouldReloadOnRetry(new ApiNetworkError("offline"))).toBe(false);
  });

  it("returns true for render errors", () => {
    expect(shouldReloadOnRetry(new Error("render"))).toBe(true);
  });

  it("returns true for unknown values", () => {
    expect(shouldReloadOnRetry("boom")).toBe(true);
  });
});

describe("isAppErrorPayload", () => {
  it("accepts a complete payload", () => {
    expect(
      isAppErrorPayload({
        appError: { kind: "server", status: 500, requestId: null },
      }),
    ).toBe(true);
  });

  it("accepts string requestIds", () => {
    expect(
      isAppErrorPayload({
        appError: { kind: "not-found", status: 404, requestId: "req-1" },
      }),
    ).toBe(true);
  });

  it("rejects an unknown kind", () => {
    expect(isAppErrorPayload({ appError: { kind: "unknown" } })).toBe(false);
  });

  it("rejects a non-object appError", () => {
    expect(isAppErrorPayload({ appError: null })).toBe(false);
    expect(isAppErrorPayload({ appError: "server" })).toBe(false);
  });

  it("rejects a non-numeric and non-null status", () => {
    expect(
      isAppErrorPayload({
        appError: { kind: "server", status: "500", requestId: null },
      }),
    ).toBe(false);
  });

  it("rejects a non-string and non-null requestId", () => {
    expect(
      isAppErrorPayload({
        appError: { kind: "server", status: 500, requestId: 1 },
      }),
    ).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(isAppErrorPayload({ appError: { kind: "server", status: 500 } }))
      .toBe(false);
    expect(isAppErrorPayload({})).toBe(false);
  });

  it("rejects non-object values without throwing", () => {
    expect(isAppErrorPayload(null)).toBe(false);
    expect(isAppErrorPayload("boom")).toBe(false);
    expect(isAppErrorPayload(undefined)).toBe(false);
  });
});
