import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  status: "booting" as
    | "booting"
    | "authenticated"
    | "connection-error",
}));

vi.mock("~/providers/auth-provider", () => ({
  useAuth: () => ({
    status: authState.status,
    reason: null,
    retry: () => undefined,
  }),
}));

vi.mock("~/components/layout/route-skeleton", () => ({
  RouteSkeleton: () => createElement("div", null, "ROUTE_SKELETON"),
}));

vi.mock("~/components/auth/auth-screen", () => ({
  AuthScreen: ({ status }: { status: string }) =>
    createElement("div", null, `AUTH_SCREEN:${status}`),
}));

import { AuthGate } from "./auth-gate";

function renderGate(): string {
  return renderToStaticMarkup(
    createElement(AuthGate, null, createElement("div", null, "CHILD")),
  );
}

describe("AuthGate", () => {
  beforeEach(() => {
    authState.status = "booting";
  });

  it("shows the page skeleton while auth is booting", () => {
    expect(renderGate()).toContain("ROUTE_SKELETON");
  });

  it("renders the protected content once authenticated", () => {
    authState.status = "authenticated";

    expect(renderGate()).toContain("CHILD");
  });

  it("renders the auth error screen on failure", () => {
    authState.status = "connection-error";

    expect(renderGate()).toContain("AUTH_SCREEN:connection-error");
  });
});
