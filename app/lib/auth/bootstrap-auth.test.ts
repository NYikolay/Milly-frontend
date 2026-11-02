import { describe, expect, it, vi } from "vitest";

import { ApiError, ApiNetworkError } from "~/lib/api/errors";
import type { AuthResponse, AuthUser, TokenResponse } from "~/lib/api/types";

import { bootstrapAuth } from "./bootstrap-auth";
import type { BootstrapAuthOptions } from "./bootstrap-auth";
import { EmptyInitDataError } from "./errors";

const user: AuthUser = {
  id: 1,
  created_at: "2026-11-02T10:00:00Z",
  telegram_profile: {
    telegram_id: 100,
    is_bot: null,
    first_name: "Milly",
    last_name: null,
    username: null,
    language_code: "en",
    is_premium: false,
    added_to_attachment_menu: null,
    allows_write_to_pm: null,
    photo_url: null,
  },
};

const authResponse: AuthResponse = {
  access_token: "access-login",
  token_type: "bearer",
  expires_in: 3600,
  user,
};

const tokenResponse: TokenResponse = {
  access_token: "access-refresh",
  token_type: "bearer",
  expires_in: 3600,
};

function apiError(status: number): ApiError {
  return new ApiError("request failed", {
    status,
    code: "test_error",
    requestId: "request-1",
  });
}

function createMocks() {
  return {
    login: vi.fn<(initData: string) => Promise<AuthResponse>>(),
    refresh: vi.fn<() => Promise<TokenResponse>>(),
    fetchMe: vi.fn<() => Promise<AuthUser>>(),
  };
}

function createOptions(
  mocks: ReturnType<typeof createMocks>,
  initData: string,
): BootstrapAuthOptions {
  return { initData, ...mocks };
}

describe("bootstrapAuth with a non-empty init data", () => {
  it("authenticates with the login user without refresh or fetchMe", async () => {
    const mocks = createMocks();
    mocks.login.mockResolvedValue(authResponse);

    const result = await bootstrapAuth(createOptions(mocks, "raw-init-data"));

    expect(result).toEqual({ status: "authenticated", user });
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.login).toHaveBeenCalledWith("raw-init-data");
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });

  it("treats whitespace-padded init data as non-empty and passes it raw", async () => {
    const mocks = createMocks();
    mocks.login.mockResolvedValue(authResponse);

    const result = await bootstrapAuth(createOptions(mocks, "  raw-init-data  "));

    expect(result).toEqual({ status: "authenticated", user });
    expect(mocks.login).toHaveBeenCalledWith("  raw-init-data  ");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("refreshes and fetches the user after login returns 401", async () => {
    const mocks = createMocks();
    mocks.login.mockRejectedValue(apiError(401));
    mocks.refresh.mockResolvedValue(tokenResponse);
    mocks.fetchMe.mockResolvedValue(user);

    const result = await bootstrapAuth(createOptions(mocks, "stale-init-data"));

    expect(result).toEqual({ status: "authenticated", user });
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.login).toHaveBeenCalledWith("stale-init-data");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.fetchMe).toHaveBeenCalledTimes(1);
  });

  it("requires reauth after login and refresh both return 401", async () => {
    const mocks = createMocks();
    mocks.login.mockRejectedValue(apiError(401));
    mocks.refresh.mockRejectedValue(apiError(401));

    const result = await bootstrapAuth(createOptions(mocks, "stale-init-data"));

    expect(result).toEqual({
      status: "reauth-required",
      reason: "session_expired",
    });
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });

  it("maps a network error from login to connection-error/network", async () => {
    const mocks = createMocks();
    mocks.login.mockRejectedValue(new ApiNetworkError("offline"));

    const result = await bootstrapAuth(createOptions(mocks, "raw-init-data"));

    expect(result).toEqual({ status: "connection-error", reason: "network" });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });

  it.each([500, 503])(
    "maps ApiError %i from login to connection-error/server",
    async (status) => {
      const mocks = createMocks();
      mocks.login.mockRejectedValue(apiError(status));

      const result = await bootstrapAuth(createOptions(mocks, "raw-init-data"));

      expect(result).toEqual({ status: "connection-error", reason: "server" });
      expect(mocks.refresh).not.toHaveBeenCalled();
      expect(mocks.fetchMe).not.toHaveBeenCalled();
    },
  );

  it("maps ApiError 403 from login to reauth-required/forbidden", async () => {
    const mocks = createMocks();
    mocks.login.mockRejectedValue(apiError(403));

    const result = await bootstrapAuth(createOptions(mocks, "raw-init-data"));

    expect(result).toEqual({ status: "reauth-required", reason: "forbidden" });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("maps ApiError 422 from login to reauth-required/init_data_invalid", async () => {
    const mocks = createMocks();
    mocks.login.mockRejectedValue(apiError(422));

    const result = await bootstrapAuth(createOptions(mocks, "raw-init-data"));

    expect(result).toEqual({
      status: "reauth-required",
      reason: "init_data_invalid",
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("maps another client error from login to reauth-required/request_failed", async () => {
    const mocks = createMocks();
    mocks.login.mockRejectedValue(apiError(418));

    const result = await bootstrapAuth(createOptions(mocks, "raw-init-data"));

    expect(result).toEqual({
      status: "reauth-required",
      reason: "request_failed",
    });
  });

  it("maps an unknown error from login to connection-error/server", async () => {
    const mocks = createMocks();
    mocks.login.mockRejectedValue(new Error("unexpected"));

    const result = await bootstrapAuth(createOptions(mocks, "raw-init-data"));

    expect(result).toEqual({ status: "connection-error", reason: "server" });
  });

  it("maps EmptyInitDataError from login to no-init-data", async () => {
    const mocks = createMocks();
    mocks.login.mockRejectedValue(new EmptyInitDataError());

    const result = await bootstrapAuth(createOptions(mocks, "raw-init-data"));

    expect(result).toEqual({
      status: "no-init-data",
      reason: "init_data_missing",
    });
  });
});

describe("bootstrapAuth with an empty init data", () => {
  it("refreshes and fetches the user without calling login", async () => {
    const mocks = createMocks();
    mocks.refresh.mockResolvedValue(tokenResponse);
    mocks.fetchMe.mockResolvedValue(user);

    const result = await bootstrapAuth(createOptions(mocks, ""));

    expect(result).toEqual({ status: "authenticated", user });
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.fetchMe).toHaveBeenCalledTimes(1);
  });

  it("treats whitespace-only init data as empty", async () => {
    const mocks = createMocks();
    mocks.refresh.mockResolvedValue(tokenResponse);
    mocks.fetchMe.mockResolvedValue(user);

    const result = await bootstrapAuth(createOptions(mocks, "   \n\t"));

    expect(result).toEqual({ status: "authenticated", user });
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("returns no-init-data when refresh returns 401", async () => {
    const mocks = createMocks();
    mocks.refresh.mockRejectedValue(apiError(401));

    const result = await bootstrapAuth(createOptions(mocks, ""));

    expect(result).toEqual({
      status: "no-init-data",
      reason: "init_data_missing",
    });
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });

  it("maps EmptyInitDataError from refresh to no-init-data", async () => {
    const mocks = createMocks();
    mocks.refresh.mockRejectedValue(new EmptyInitDataError());

    const result = await bootstrapAuth(createOptions(mocks, ""));

    expect(result).toEqual({
      status: "no-init-data",
      reason: "init_data_missing",
    });
  });
});

describe("bootstrapAuth refresh failures", () => {
  it.each([
    [403, "forbidden"],
    [422, "init_data_invalid"],
  ] as const)(
    "maps ApiError %i from refresh to reauth-required/%s",
    async (status, reason) => {
      const mocks = createMocks();
      mocks.login.mockRejectedValue(apiError(401));
      mocks.refresh.mockRejectedValue(apiError(status));

      const result = await bootstrapAuth(createOptions(mocks, "stale-init-data"));

      expect(result).toEqual({ status: "reauth-required", reason });
      expect(mocks.fetchMe).not.toHaveBeenCalled();
    },
  );

  it("maps a network error from refresh to connection-error/network", async () => {
    const mocks = createMocks();
    mocks.refresh.mockRejectedValue(new ApiNetworkError("offline"));

    const result = await bootstrapAuth(createOptions(mocks, ""));

    expect(result).toEqual({ status: "connection-error", reason: "network" });
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });

  it.each([500, 503])(
    "maps ApiError %i from refresh to connection-error/server",
    async (status) => {
      const mocks = createMocks();
      mocks.login.mockRejectedValue(apiError(401));
      mocks.refresh.mockRejectedValue(apiError(status));

      const result = await bootstrapAuth(createOptions(mocks, "stale-init-data"));

      expect(result).toEqual({ status: "connection-error", reason: "server" });
      expect(mocks.fetchMe).not.toHaveBeenCalled();
    },
  );

  it("maps an unknown error from refresh to connection-error/server", async () => {
    const mocks = createMocks();
    mocks.refresh.mockRejectedValue(new Error("unexpected"));

    const result = await bootstrapAuth(createOptions(mocks, ""));

    expect(result).toEqual({ status: "connection-error", reason: "server" });
  });
});

describe("bootstrapAuth fetchMe failures", () => {
  it("requires reauth without fallback login when fetchMe returns 401", async () => {
    const mocks = createMocks();
    mocks.login.mockRejectedValue(apiError(401));
    mocks.refresh.mockResolvedValue(tokenResponse);
    mocks.fetchMe.mockRejectedValue(apiError(401));

    const result = await bootstrapAuth(createOptions(mocks, "stale-init-data"));

    expect(result).toEqual({
      status: "reauth-required",
      reason: "session_expired",
    });
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.fetchMe).toHaveBeenCalledTimes(1);
  });

  it.each([
    [403, "forbidden"],
    [422, "init_data_invalid"],
    [418, "request_failed"],
  ] as const)(
    "maps ApiError %i from fetchMe to reauth-required/%s",
    async (status, reason) => {
      const mocks = createMocks();
      mocks.refresh.mockResolvedValue(tokenResponse);
      mocks.fetchMe.mockRejectedValue(apiError(status));

      const result = await bootstrapAuth(createOptions(mocks, ""));

      expect(result).toEqual({ status: "reauth-required", reason });
    },
  );

  it("maps a network error from fetchMe to connection-error/network", async () => {
    const mocks = createMocks();
    mocks.refresh.mockResolvedValue(tokenResponse);
    mocks.fetchMe.mockRejectedValue(new ApiNetworkError("offline"));

    const result = await bootstrapAuth(createOptions(mocks, ""));

    expect(result).toEqual({ status: "connection-error", reason: "network" });
  });

  it.each([500, 503])(
    "maps ApiError %i from fetchMe to connection-error/server",
    async (status) => {
      const mocks = createMocks();
      mocks.refresh.mockResolvedValue(tokenResponse);
      mocks.fetchMe.mockRejectedValue(apiError(status));

      const result = await bootstrapAuth(createOptions(mocks, ""));

      expect(result).toEqual({ status: "connection-error", reason: "server" });
    },
  );

  it("maps an unknown error from fetchMe to connection-error/server", async () => {
    const mocks = createMocks();
    mocks.refresh.mockResolvedValue(tokenResponse);
    mocks.fetchMe.mockRejectedValue(new Error("unexpected"));

    const result = await bootstrapAuth(createOptions(mocks, ""));

    expect(result).toEqual({ status: "connection-error", reason: "server" });
  });
});

describe("bootstrapAuth abort handling", () => {
  it("rethrows an AbortError from login unchanged", async () => {
    const mocks = createMocks();
    const abortError = new DOMException("Aborted", "AbortError");
    mocks.login.mockRejectedValue(abortError);

    await expect(bootstrapAuth(createOptions(mocks, "raw-init-data"))).rejects.toBe(
      abortError,
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("rethrows an AbortError from refresh unchanged", async () => {
    const mocks = createMocks();
    const abortError = new DOMException("Aborted", "AbortError");
    mocks.refresh.mockRejectedValue(abortError);

    await expect(bootstrapAuth(createOptions(mocks, ""))).rejects.toBe(abortError);
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });

  it("rethrows an AbortError from fetchMe unchanged", async () => {
    const mocks = createMocks();
    const abortError = new DOMException("Aborted", "AbortError");
    mocks.refresh.mockResolvedValue(tokenResponse);
    mocks.fetchMe.mockRejectedValue(abortError);

    await expect(bootstrapAuth(createOptions(mocks, ""))).rejects.toBe(abortError);
  });
});
