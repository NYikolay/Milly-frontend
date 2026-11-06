import { describe, expect, it } from "vitest";

import { getProjectIcon } from "./project-icons";

describe("getProjectIcon", () => {
  it("maps a known icon name to the projects-icons asset", () => {
    expect(getProjectIcon("leaf")).toContain("leaf.svg");
  });

  it("falls back to no-project for empty and unknown icons", () => {
    const fallback = getProjectIcon(null);
    expect(fallback).toContain("no-project.svg");
    expect(getProjectIcon("")).toBe(fallback);
    expect(getProjectIcon("missing-icon")).toBe(fallback);
  });
});
