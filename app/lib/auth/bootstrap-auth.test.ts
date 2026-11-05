import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, ApiNetworkError } from "~/lib/api/errors";
import type { AuthResponse, AuthUser, TokenResponse } from "~/lib/api/types";

import { bootstrapAuth } from "./bootstrap-auth";
import type {
  BootstrapAuthOptions,
  BootstrapRequestOptions,
} from "./bootstrap-auth";
import { EmptyInitDataError } from "./errors";
import { AUTH_BOOTSTRAP_BUDGET_MS } from "./timeouts";

const user: AuthUser = {
  id: 1,
  timezone: "UTC",
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

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function createMocks() {
  return {
    login:
      vi.fn<
        (
          initData: string,
          options: BootstrapRequestOptions,
        ) => Promise<AuthResponse>
      >(),
    refresh:
      vi.fn<(options: BootstrapRequestOptions) => Promise<TokenResponse>>(),
    fetchMe: vi.fn<(options: BootstrapRequestOptions) => Promise<AuthUser>>(),
  };
}

function createOptions(
  mocks: ReturnType<typeof createMocks>,
  initData: string,
  overrides: Partial<
    Pick<BootstrapAuthOptions, "budgetMs" | "requestTimeoutMs">
  > = {},
): BootstrapAuthOptions {
  return {
    initData,
    budgetMs: AUTH_BOOTSTRAP_BUDGET_MS,
    ...overrides,
    ...mocks,
  };
}

describe("bootstrapAuth with a non-empty init data", () => {
  it("authenticates with the login user without refresh or fetchMe", async () => {
    const mocks = createMocks();
    mocks.login.mockResolvedValue(authResponse);

    const result = await bootstrapAuth(createOptions(mocks, "raw-init-data"));

    expect(result).toEqual({ status: "authenticated", user });
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.login).toHaveBeenCalledWith(
      "raw-init-data",
      expect.objectContaining({ timeoutMs: AUTH_BOOTSTRAP_BUDGET_MS }),
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });

  it("treats whitespace-padded init data as non-empty and passes it raw", async () => {
    const mocks = createMocks();
    mocks.login.mockResolvedValue(authResponse);

    const result = await bootstrapAuth(createOptions(mocks, "  raw-init-data  "));

    expect(result).toEqual({ status: "authenticated", user });
    expect(mocks.login).toHaveBeenCalledWith(
      "  raw-init-data  ",
      expect.objectContaining({ timeoutMs: AUTH_BOOTSTRAP_BUDGET_MS }),
    );
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
    expect(mocks.login).toHaveBeenCalledWith(
      "stale-init-data",
      expect.objectContaining({ timeoutMs: AUTH_BOOTSTRAP_BUDGET_MS }),
    );
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

describe("bootstrapAuth budget", () => {
  it("returns connection-error/network when the budget expires", async () => {
    const mocks = createMocks();
    mocks.login.mockImplementation(() => new Promise<AuthResponse>(() => {}));

    const promise = bootstrapAuth(createOptions(mocks, "raw-init-data"));

    await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_BUDGET_MS);

    await expect(promise).resolves.toEqual({
      status: "connection-error",
      reason: "network",
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });

  it("aborts the request signal when the budget expires", async () => {
    const mocks = createMocks();
    mocks.login.mockImplementation(() => new Promise<AuthResponse>(() => {}));

    const promise = bootstrapAuth(createOptions(mocks, "raw-init-data"));
    const options = mocks.login.mock.calls[0]?.[1];

    expect(options?.signal.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_BUDGET_MS);
    await promise;

    expect(options?.signal.aborted).toBe(true);
  });

  it("bounds each request timeout by the remaining budget", async () => {
    const mocks = createMocks();
    let rejectLogin!: (error: unknown) => void;
    mocks.login.mockImplementation(
      () =>
        new Promise<AuthResponse>((_, reject) => {
          rejectLogin = reject;
        }),
    );
    mocks.refresh.mockResolvedValue(tokenResponse);
    mocks.fetchMe.mockResolvedValue(user);

    const promise = bootstrapAuth(
      createOptions(mocks, "raw-init-data", {
        budgetMs: 5000,
        requestTimeoutMs: 10000,
      }),
    );

    await vi.advanceTimersByTimeAsync(2000);
    rejectLogin(apiError(401));

    await expect(promise).resolves.toEqual({ status: "authenticated", user });

    const loginOptions = mocks.login.mock.calls[0]?.[1];
    const refreshOptions = mocks.refresh.mock.calls[0]?.[0];
    const fetchMeOptions = mocks.fetchMe.mock.calls[0]?.[0];

    expect(loginOptions?.timeoutMs).toBe(5000);
    expect(refreshOptions?.timeoutMs).toBe(3000);
    expect(fetchMeOptions?.timeoutMs).toBe(3000);
    expect(loginOptions?.signal).toBe(refreshOptions?.signal);
    expect(refreshOptions?.signal).toBe(fetchMeOptions?.signal);
  });

  it("does not start the next request when the budget is exhausted", async () => {
    const mocks = createMocks();
    let rejectLogin!: (error: unknown) => void;
    mocks.login.mockImplementation(
      () =>
        new Promise<AuthResponse>((_, reject) => {
          rejectLogin = reject;
        }),
    );

    const promise = bootstrapAuth(createOptions(mocks, "raw-init-data"));

    await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_BUDGET_MS - 1);
    vi.setSystemTime(Date.now() + 1);
    rejectLogin(apiError(401));

    await expect(promise).resolves.toEqual({
      status: "connection-error",
      reason: "network",
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });

  it("uses requestTimeoutMs when it is below the remaining budget", async () => {
    const mocks = createMocks();
    mocks.login.mockResolvedValue(authResponse);

    const result = await bootstrapAuth(
      createOptions(mocks, "raw-init-data", { requestTimeoutMs: 1500 }),
    );

    expect(result).toEqual({ status: "authenticated", user });
    expect(mocks.login.mock.calls[0]?.[1]?.timeoutMs).toBe(1500);
  });

  it("finishes within a custom budget of 3000 ms", async () => {
    const mocks = createMocks();
    mocks.login.mockImplementation(() => new Promise<AuthResponse>(() => {}));

    let settled = false;
    const promise = bootstrapAuth(
      createOptions(mocks, "raw-init-data", { budgetMs: 3000 }),
    ).then((result) => {
      settled = true;

      return result;
    });

    await vi.advanceTimersByTimeAsync(2999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);

    await expect(promise).resolves.toEqual({
      status: "connection-error",
      reason: "network",
    });
    expect(settled).toBe(true);
  });

  it.each([0, -1])(
    "returns connection-error/network without requests when budgetMs is %i",
    async (budgetMs) => {
      const mocks = createMocks();

      const result = await bootstrapAuth(
        createOptions(mocks, "raw-init-data", { budgetMs }),
      );

      expect(result).toEqual({ status: "connection-error", reason: "network" });
      expect(mocks.login).not.toHaveBeenCalled();
      expect(mocks.refresh).not.toHaveBeenCalled();
      expect(mocks.fetchMe).not.toHaveBeenCalled();
    },
  );

  it("ignores a late login success after the budget expires", async () => {
    const mocks = createMocks();
    let resolveLogin!: (response: AuthResponse) => void;
    mocks.login.mockImplementation(
      () =>
        new Promise<AuthResponse>((resolve) => {
          resolveLogin = resolve;
        }),
    );

    const promise = bootstrapAuth(createOptions(mocks, "raw-init-data"));

    await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_BUDGET_MS);

    await expect(promise).resolves.toEqual({
      status: "connection-error",
      reason: "network",
    });

    resolveLogin(authResponse);
    await vi.advanceTimersByTimeAsync(0);

    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });

  it("maps a request timeout from login to connection-error/network", async () => {
    const mocks = createMocks();
    mocks.login.mockRejectedValue(new ApiNetworkError("Request timed out"));

    const result = await bootstrapAuth(createOptions(mocks, "raw-init-data"));

    expect(result).toEqual({ status: "connection-error", reason: "network" });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.fetchMe).not.toHaveBeenCalled();
  });
});
