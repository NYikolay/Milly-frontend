import { describe, expect, it } from "vitest";

import { matchesSearchQuery } from "./text-search";

describe("matchesSearchQuery", () => {
  it("matches everything for an empty or whitespace query", () => {
    expect(matchesSearchQuery("Работа", "")).toBe(true);
    expect(matchesSearchQuery("Работа", "   ")).toBe(true);
  });

  it("matches case-insensitive substrings", () => {
    expect(matchesSearchQuery("Работа", "раб")).toBe(true);
    expect(matchesSearchQuery("Работа", "РАБ")).toBe(true);
    expect(matchesSearchQuery("Работа", "бот")).toBe(true);
  });

  it("rejects non-matching strings", () => {
    expect(matchesSearchQuery("Работа", "дом")).toBe(false);
  });
});
