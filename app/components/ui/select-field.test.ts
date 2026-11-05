import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SelectField } from "./select-field";

describe("SelectField", () => {
  it("renders the selected label and a collapsed listbox trigger", () => {
    const html = renderToStaticMarkup(
      createElement(SelectField, {
        value: 1,
        options: [
          { value: 1, label: "Каждый день" },
          { value: 7, label: "Каждую неделю" },
        ],
        onChange: () => {},
        ariaLabel: "Повторять",
      }),
    );

    expect(html).toContain("Каждый день");
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
  });
});
