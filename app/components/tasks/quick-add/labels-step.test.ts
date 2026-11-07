import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  LabelsStep,
  filterLabelList,
  getLabelsStepMessage,
} from "./labels-step";

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
      onChange: () => {},
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

  it("fills the expanded sheet and pins the apply action to the bottom", () => {
    const html = render();

    expect(html).toContain("flex flex-1 flex-col");
    expect(html).toContain("mt-auto pt-[15px]");
  });

  it("renders labels with their color and selected state", () => {
    const html = render({ labels: [label], selectedIds: [3] });

    expect(html).toContain("Личное");
    expect(html).toContain("#16A34A");
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("Готово");
    expect(html).toContain("tag-raw.svg");
    expect(html).not.toContain("tag.svg");
    expect(html).toContain("size-[18px]");
    expect(html).toContain("h-[50px]");
    expect(html).toContain("size-5");
    expect(html).toContain("size-[15px]");
    expect(html).toContain(
      "min-w-0 flex-1 truncate text-[15px] leading-[1.3]",
    );
    expect(html).toContain('placeholder="Поиск"');
    expect(html).toContain('aria-label="Поиск меток"');
    expect(html).toContain("h-[45px]");
    expect(html).toContain("mt-[15px]");
    expect(html).toContain("flex flex-col gap-[10px] px-[15px]");
  });

  it("renders the selection from the controlled selectedIds", () => {
    const html = render({ labels: [label], selectedIds: [3] });
    expect(html).toContain('aria-checked="true"');

    const empty = render({ labels: [label], selectedIds: [] });
    expect(empty).toContain('aria-checked="false"');
    expect(empty).toContain("border-app-text-secondary/55");
  });

  it("draws a divider after every label row", () => {
    const html = render({ labels: [label] });

    expect(html.match(/border-b border-app-stroke/g)).toHaveLength(1);
  });

  it("filters labels by name case-insensitively", () => {
    expect(filterLabelList([label], "лич")).toHaveLength(1);
    expect(filterLabelList([label], "ЛИЧ")).toHaveLength(1);
    expect(filterLabelList([label], "дом")).toHaveLength(0);
    expect(filterLabelList([label], "  ")).toHaveLength(1);
  });

  it("renders loading and retry states", () => {
    expect(render({ isLoading: true })).toContain("Загружаем метки…");
    const error = render({ isError: true });
    expect(error).toContain("Не удалось загрузить метки");
    expect(error).toContain("Повторить");
  });
});
