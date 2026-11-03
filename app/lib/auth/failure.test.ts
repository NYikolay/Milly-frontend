import { describe, expect, it } from "vitest";

import { ApiError, ApiNetworkError } from "~/lib/api/errors";

import { EmptyInitDataError } from "./errors";
import { classifyAuthFailure, isAbortError } from "./failure";

function apiError(status: number): ApiError {
  return new ApiError("request failed", {
    status,
    code: "test_error",
    requestId: "request-1",
  });
}

describe("classifyAuthFailure", () => {
  it("classifies ApiNetworkError as connection-error/network", () => {
    expect(classifyAuthFailure(new ApiNetworkError("offline"), "session_expired")).toEqual({
      status: "connection-error",
      reason: "network",
    });
  });

  it("classifies a request timeout as connection-error/network", () => {
    expect(
      classifyAuthFailure(new ApiNetworkError("Request timed out"), "session_expired"),
    ).toEqual({ status: "connection-error", reason: "network" });
  });

  it("classifies ApiError 401 as reauth-required with the unauthorized reason", () => {
    expect(classifyAuthFailure(apiError(401), "session_expired")).toEqual({
      status: "reauth-required",
      reason: "session_expired",
    });
  });

  it("classifies ApiError 403 as reauth-required/forbidden", () => {
    expect(classifyAuthFailure(apiError(403), "session_expired")).toEqual({
      status: "reauth-required",
      reason: "forbidden",
    });
  });

  it("classifies ApiError 422 as reauth-required/init_data_invalid", () => {
    expect(classifyAuthFailure(apiError(422), "session_expired")).toEqual({
      status: "reauth-required",
      reason: "init_data_invalid",
    });
  });

  it.each([500, 503])(
    "classifies ApiError %i as connection-error/server",
    (status) => {
      expect(classifyAuthFailure(apiError(status), "session_expired")).toEqual({
        status: "connection-error",
        reason: "server",
      });
    },
  );

  it("classifies other client statuses as reauth-required/request_failed", () => {
    expect(classifyAuthFailure(apiError(418), "session_expired")).toEqual({
      status: "reauth-required",
      reason: "request_failed",
    });
  });

  it("classifies EmptyInitDataError as no-init-data/init_data_missing", () => {
    expect(classifyAuthFailure(new EmptyInitDataError(), "session_expired")).toEqual({
      status: "no-init-data",
      reason: "init_data_missing",
    });
  });

  it("classifies an unknown error as connection-error/server", () => {
    expect(classifyAuthFailure(new Error("unexpected"), "session_expired")).toEqual({
      status: "connection-error",
      reason: "server",
    });
  });
});

describe("abort errors", () => {
  it("isAbortError recognizes an AbortError", () => {
    expect(isAbortError(new DOMException("Aborted", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("Aborted"))).toBe(false);
  });

  it("classifyAuthFailure rethrows an AbortError instead of classifying it", () => {
    const abortError = new DOMException("Aborted", "AbortError");

    try {
      classifyAuthFailure(abortError, "session_expired");
      expect.unreachable("AbortError should have been rethrown");
    } catch (error) {
      expect(error).toBe(abortError);
    }
  });
});
