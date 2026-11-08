import { useRef } from "react";
import type { ReactElement } from "react";

import { Modal } from "~/components/ui/modal";

export interface DeleteTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showSeriesWarning: boolean;
  isPending: boolean;
  error: string | null;
  onConfirm: () => void;
}

export function DeleteTaskModal({
  open,
  onOpenChange,
  showSeriesWarning,
  isPending,
  error,
  onConfirm,
}: DeleteTaskModalProps): ReactElement {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      className="inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md pb-[max(15px,var(--app-inset-bottom))] pl-[max(16px,var(--app-inset-left))] pr-[max(16px,var(--app-inset-right))]"
      closeOnEscape={!isPending}
      closeOnOverlayClick={!isPending}
      describedBy={showSeriesWarning ? "delete-task-description" : undefined}
      initialFocusRef={cancelRef}
      labelledBy="delete-task-title"
      onOpenChange={onOpenChange}
      open={open}
      variant="sheet"
    >
      <div className="flex flex-col gap-[10px]">
        <div className="overflow-hidden rounded-[25px] bg-app-card">
          <div className="border-b border-app-stroke px-[15px] py-[15px] text-center">
            <h2
              className="text-[15px] font-semibold leading-[1.4] text-app-text"
              id="delete-task-title"
            >
              Вы точно хотите удалить задачу?
            </h2>
            {showSeriesWarning ? (
              <p
                className="mt-[5px] text-[13px] leading-[1.4] text-app-text-secondary"
                id="delete-task-description"
              >
                При удалении регулярной задачи также удаляются и будущие задачи этой серии
              </p>
            ) : null}
            {error ? (
              <p
                className="mt-[10px] text-[13px] leading-[1.4] text-app-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </div>
          <button
            aria-busy={isPending || undefined}
            className="h-[50px] w-full text-[15px] font-semibold text-app-destructive focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70 disabled:opacity-50"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            Удалить задачу
          </button>
        </div>
        <button
          aria-busy={isPending || undefined}
          className="h-[50px] w-full rounded-[25px] bg-app-card text-[15px] font-semibold text-app-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent active:opacity-70 disabled:opacity-50"
          disabled={isPending}
          onClick={() => onOpenChange(false)}
          ref={cancelRef}
          type="button"
        >
          Отмена
        </button>
      </div>
    </Modal>
  );
}
