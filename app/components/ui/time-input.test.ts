import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TimeInput } from "./time-input";

describe("TimeInput", () => {
  it("renders the default due-step pill", () => {
    const html = renderToStaticMarkup(
      createElement(TimeInput, {
        value: "16:00",
        onChange: () => {},
        ariaLabel: "Время",
      }),
    );

    expect(html).toContain("rounded-xl");
    expect(html).toContain("text-[17px]");
  });

  it("renders the compact reminders pill", () => {
    const html = renderToStaticMarkup(
      createElement(TimeInput, {
        value: "14:00",
        onChange: () => {},
        ariaLabel: "Время",
        size: "compact",
      }),
    );

    expect(html).toContain("rounded-[28px]");
    expect(html).toContain("text-[15px]");
    expect(html).not.toContain("rounded-xl");
  });
});
