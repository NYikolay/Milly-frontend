import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LabelsStep, getLabelsStepMessage } from "./labels-step";

const label = {
  id: 3,
  name: "Личное",
  color: { id: 4, slug: "green", name: "Зелёный", hex: "#16A34A" },
  created_at: "2026-11-05T09:00:00Z",
  updated_at: "2026-11-05T09:00:00Z",
};

function render(overrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(LabelsStep, {
      labels: [],
      isLoading: false,
      isError: false,
      selectedIds: [],
      onRetry: () => {},
      onApply: () => {},
      ...overrides,
    }),
  );
}

describe("LabelsStep", () => {
  it("uses the exact empty-state copy", () => {
    expect(getLabelsStepMessage("empty")).toBe(
      "На текущий момент у вас не создано ни 1 метки",
    );
    expect(render()).toContain(
      "На текущий момент у вас не создано ни 1 метки",
    );
  });

  it("renders labels with their color and selected state", () => {
    const html = render({ labels: [label], selectedIds: [3] });

    expect(html).toContain("Личное");
    expect(html).toContain("#16A34A");
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("Применить");
  });

  it("renders loading and retry states", () => {
    expect(render({ isLoading: true })).toContain("Загружаем метки…");
    const error = render({ isError: true });
    expect(error).toContain("Не удалось загрузить метки");
    expect(error).toContain("Повторить");
  });
});
