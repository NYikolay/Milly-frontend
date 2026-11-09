import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { LabelResponse } from "~/lib/labels/types";

import {
  filterLabels,
  TaskLabelsView,
  type TaskLabelsViewProps,
} from "./task-labels-view";

function label(overrides: Partial<LabelResponse> = {}): LabelResponse {
  return {
    id: 3,
    name: "Срочно",
    color: { id: 4, slug: "red", name: "Красный", hex: "#DC2626" },
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:00:00.000Z",
    ...overrides,
  };
}

function render(props: Partial<TaskLabelsViewProps> = {}): string {
  return renderToStaticMarkup(
    createElement(TaskLabelsView, {
      selectedIds: [],
      labels: [label()],
      isLabelsLoading: false,
      isLabelsError: false,
      onRetryLabels: () => {},
      onToggle: () => {},
      ...props,
    }),
  );
}

describe("filterLabels", () => {
  it("filters by name case-insensitively", () => {
    const labels = [label(), label({ id: 4, name: "Работа" })];

    expect(filterLabels(labels, "раб")).toEqual([labels[1]]);
    expect(filterLabels(labels, "РАБ")).toEqual([labels[1]]);
  });

  it("returns all labels for an empty query", () => {
    const labels = [label(), label({ id: 4, name: "Работа" })];

    expect(filterLabels(labels, "  ")).toEqual(labels);
  });
});

describe("TaskLabelsView", () => {
  it("renders the header, subtitle, create button and explanation", () => {
    const html = render();

    expect(html).toContain("Выбор меток задачи");
    expect(html).toContain(
      "Выберите или создайте метки для текущей задачи.",
    );
    expect(html).toContain("Создать метку");
    expect(html).toContain("tag-plus.svg");
    expect(html).toContain(
      "Это позволит вам группировать и фильтровать свои задачи",
    );
  });

  it("renders the search field and labels list", () => {
    const html = render({
      labels: [label(), label({ id: 4, name: "Работа" })],
    });

    expect(html).toContain('aria-label="Поиск меток"');
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Метки"');
    expect(html.match(/role="checkbox"/g)).toHaveLength(2);
  });

  it("marks selected labels with aria-checked", () => {
    const html = render({
      labels: [label(), label({ id: 4, name: "Работа" })],
      selectedIds: [3],
    });

    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toContain("bg-app-accent");
  });

  it("renders backend label colors and tag icons", () => {
    const html = render();

    expect(html).toContain("#DC2626");
    expect(html).toContain("tag-raw.svg");
    expect(html).not.toContain("dark:");
  });

  it("draws dividers only between rows", () => {
    const html = render({
      labels: [label(), label({ id: 4, name: "Работа" })],
    });

    expect(html.match(/border-b border-app-stroke/g)).toHaveLength(1);
  });

  it("renders the empty state without search or a list", () => {
    const html = render({ labels: [] });

    expect(html).toContain(
      "На данный момент у вас отсутствуют какие-либо метки, но вы можете создать первую прямо сейчас.",
    );
    expect(html).not.toContain('aria-label="Поиск меток"');
    expect(html).not.toContain('role="group"');
    expect(html).toContain("Создать метку");
    expect(html).toContain(
      "Это позволит вам группировать и фильтровать свои задачи",
    );
  });

  it("shows the initial labels loading state", () => {
    const html = render({ labels: [], isLabelsLoading: true });

    expect(html).toContain("Загружаем метки…");
    expect(html).not.toContain('aria-label="Поиск меток"');
    expect(html).not.toContain('role="group"');
  });

  it("keeps cached labels visible while a background fetch is loading", () => {
    const html = render({ isLabelsLoading: true });

    expect(html).toContain("Срочно");
    expect(html).toContain('aria-label="Поиск меток"');
    expect(html).toContain('role="group"');
    expect(html).toContain("Загружаем метки…");
  });

  it("shows the initial labels error and retry", () => {
    const onRetryLabels = vi.fn();
    const html = render({
      labels: [],
      isLabelsError: true,
      onRetryLabels,
    });

    expect(html).toContain("Не удалось загрузить метки");
    expect(html).toContain("Повторить");
    expect(html).not.toContain('aria-label="Поиск меток"');
    expect(html).not.toContain('role="group"');
  });

  it("keeps cached labels visible on a refetch error", () => {
    const html = render({ isLabelsError: true });

    expect(html).toContain("Срочно");
    expect(html).toContain("Не удалось загрузить метки");
    expect(html).toContain("Повторить");
  });

  it("uses app tokens", () => {
    const html = render();

    expect(html).toContain("bg-app-card");
    expect(html).toContain("text-app-accent");
    expect(html).toContain("text-app-text-secondary");
  });
});
