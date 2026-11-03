import { describe, expect, it } from "vitest";

import { ApiError, ApiNetworkError } from "~/lib/api/errors";

import { throwAppError } from "./route-error";

function routeError(status: number, data: unknown = null): unknown {
  return { status, statusText: "", internal: false, data };
}

function captureThrown(error: unknown): unknown {
  try {
    throwAppError(error);
  } catch (thrown) {
    return thrown;
  }
}

describe("throwAppError", () => {
  it("throws a data response with the classified ApiError", () => {
    expect(
      captureThrown(
        new ApiError("Internal server error", {
          status: 500,
          code: "internal_error",
          requestId: "req-1",
        }),
      ),
    ).toMatchObject({
      type: "DataWithResponseInit",
      data: {
        appError: { kind: "server", status: 500, requestId: "req-1" },
      },
      init: { status: 500 },
    });
  });

  it("throws a 500 data response for an unknown error", () => {
    expect(captureThrown(new Error("boom"))).toMatchObject({
      type: "DataWithResponseInit",
      data: {
        appError: { kind: "server", status: null, requestId: null },
      },
      init: { status: 500 },
    });
  });

  it("rethrows an existing route error response unchanged", () => {
    const original = routeError(404);

    expect(captureThrown(original)).toBe(original);
  });

  it("maps ApiError 429 to a 429 data response", () => {
    expect(
      captureThrown(
        new ApiError("Too many requests", {
          status: 429,
          code: "rate_limited",
          requestId: "req-2",
        }),
      ),
    ).toMatchObject({
      type: "DataWithResponseInit",
      data: {
        appError: { kind: "rate-limited", status: 429, requestId: "req-2" },
      },
      init: { status: 429 },
    });
  });

  it("maps ApiNetworkError to a 500 data response", () => {
    expect(captureThrown(new ApiNetworkError("offline"))).toMatchObject({
      type: "DataWithResponseInit",
      data: {
        appError: { kind: "server", status: null, requestId: null },
      },
      init: { status: 500 },
    });
  });
});
