import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LabelsFilterStep } from "./labels-filter-step";

const LABELS = [
  { id: 1, name: "Продолжить", color: { id: 1, slug: "pink", name: "Розовый", hex: "#d82f70" }, created_at: "", updated_at: "" },
  { id: 2, name: "Дрочить", color: { id: 2, slug: "green", name: "Зелёный", hex: "#40de82" }, created_at: "", updated_at: "" },
];

describe("LabelsFilterStep", () => {
  it("renders search, colored rows and checkbox selection", () => {
    const html = renderToStaticMarkup(
      createElement(LabelsFilterStep, {
        labels: LABELS,
        isLoading: false,
        isError: false,
        onRetry: vi.fn(),
        initialSelectedIds: [1],
        onApply: vi.fn(),
      }),
    );

    expect(html).toContain('aria-label="Поиск меток"');
    expect(html).toContain("Продолжить");
    expect(html).toContain("Дрочить");
    expect(html).toContain("#d82f70");
    expect(html).toContain("#40de82");
    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("Готово");
    expect(html).not.toContain("flex flex-col gap-[10px]");
    expect(html.match(/border-b border-app-stroke/g)).toHaveLength(1);
  });

  it("renders loading, error, empty and no-match states", () => {
    const loading = renderToStaticMarkup(
      createElement(LabelsFilterStep, { labels: [], isLoading: true, isError: false, onRetry: vi.fn(), initialSelectedIds: [], onApply: vi.fn() }),
    );
    const error = renderToStaticMarkup(
      createElement(LabelsFilterStep, { labels: [], isLoading: false, isError: true, onRetry: vi.fn(), initialSelectedIds: [], onApply: vi.fn() }),
    );
    const empty = renderToStaticMarkup(
      createElement(LabelsFilterStep, { labels: [], isLoading: false, isError: false, onRetry: vi.fn(), initialSelectedIds: [], onApply: vi.fn() }),
    );

    expect(loading).toContain("Загружаем метки…");
    expect(error).toContain("Не удалось загрузить метки");
    expect(empty).toContain("На текущий момент у вас не создано ни 1 метки");
  });
});
