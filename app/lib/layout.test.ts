import { describe, expect, it } from "vitest";

import {
  CONTENT_BOTTOM_PADDING,
  CONTENT_BOTTOM_PADDING_WITH_FAB,
} from "./layout";

describe("layout constants", () => {
  it("keeps the exact bottom paddings", () => {
    expect(CONTENT_BOTTOM_PADDING).toBe(
      "calc(89px + max(0px, 30px - var(--app-inset-bottom)))",
    );
    expect(CONTENT_BOTTOM_PADDING_WITH_FAB).toBe(
      "calc(145px + max(0px, 30px - var(--app-inset-bottom)))",
    );
  });
});
