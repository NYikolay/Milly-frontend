import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppToaster } from "./app-toaster";

describe("AppToaster", () => {
  it("does not render during SSR so sonner stays client-only", () => {
    expect(renderToStaticMarkup(createElement(AppToaster))).toBe("");
  });
});
