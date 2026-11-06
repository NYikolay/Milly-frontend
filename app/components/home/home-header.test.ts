import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import logoIcon from "~/assets/icons/Logo.svg";

import { HomeHeader } from "./home-header";

describe("HomeHeader", () => {
  it("renders the Milly logo above the greeting", () => {
    const html = renderToStaticMarkup(
      createElement(HomeHeader, { greeting: "Привет, Николай!" }),
    );

    expect(html).toContain(`src="${logoIcon}"`);
    expect(html).toContain("size-[50px]");
    expect(html).toContain("Привет, Николай!");
    expect(html).toContain("items-center");
    expect(html).toContain("gap-[5px]");
  });
});
