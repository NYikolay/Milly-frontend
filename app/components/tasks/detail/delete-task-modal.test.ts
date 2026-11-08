import { createElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  DeleteTaskModal,
  type DeleteTaskModalProps,
} from "./delete-task-modal";

const modal = vi.hoisted(() => ({
  props: undefined as Record<string, unknown> | undefined,
}));

vi.mock("~/components/ui/modal", () => ({
  Modal: (props: { children: ReactNode } & Record<string, unknown>) => {
    modal.props = props;
    return createElement("div", null, props.children);
  },
}));

function render(props: Partial<DeleteTaskModalProps> = {}): string {
  return renderToStaticMarkup(
    createElement(DeleteTaskModal, {
      open: true,
      onOpenChange: () => {},
      showSeriesWarning: false,
      isPending: false,
      error: null,
      onConfirm: () => {},
      ...props,
    }),
  );
}

describe("DeleteTaskModal", () => {
  it("renders the question, series warning and actions", () => {
    const html = render({ open: true, showSeriesWarning: true });
    expect(html).toContain("Вы точно хотите удалить задачу?");
    expect(html).toContain(
      "При удалении регулярной задачи также удаляются и будущие задачи этой серии",
    );
    expect(html).toContain("Удалить задачу");
    expect(html).toContain("Отмена");
    expect(html).not.toContain("Удалить проект");
    expect(modal.props?.describedBy).toBe("delete-task-description");
  });

  it("hides the series warning for a one-off task", () => {
    const html = render({ open: true, showSeriesWarning: false });
    expect(html).not.toContain("При удалении регулярной задачи");
    expect(modal.props?.describedBy).toBeUndefined();
  });

  it("disables actions while pending and blocks overlay/escape", () => {
    const html = render({ open: true, isPending: true });
    expect(html.match(/disabled=""/g)?.length).toBe(2);
    expect(html).toContain('aria-busy="true"');
    expect(modal.props?.closeOnOverlayClick).toBe(false);
    expect(modal.props?.closeOnEscape).toBe(false);
  });

  it("renders the delete error", () => {
    const html = render({
      open: true,
      error: "Не удалось удалить задачу. Попробуйте ещё раз.",
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Не удалось удалить задачу");
  });
});
