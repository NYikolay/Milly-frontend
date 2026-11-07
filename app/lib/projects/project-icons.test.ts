import { describe, expect, it } from "vitest";

import { getProjectIcon, NO_PROJECT_ICON } from "./project-icons";

describe("project icons", () => {
  it("maps a known icon name to the projects-icons asset", () => {
    expect(getProjectIcon("book")).toContain("book.svg");
    expect(getProjectIcon("file-music")).toContain("file-music.svg");
  });

  it("exposes the no-project asset separately from the fallback", () => {
    expect(NO_PROJECT_ICON).toContain("no-project.svg");
    expect(getProjectIcon(null)).toContain("file.svg");
    expect(getProjectIcon("")).toBe(getProjectIcon(null));
    expect(getProjectIcon("missing-icon")).toBe(getProjectIcon(null));
  });
});
