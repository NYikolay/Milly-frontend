import type { ReactElement } from "react";

export interface TaskDetailErrorProps {
  kind: "not-found" | "load-error";
  onBack: () => void;
  onRetry: () => void;
}

export function TaskDetailError({
  kind,
  onBack,
  onRetry,
}: TaskDetailErrorProps): ReactElement {
  const isNotFound = kind === "not-found";

  return (
    <div className="pt-4">
      <div
        className="flex flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px]"
        role="alert"
      >
        <p className="text-[17px] font-semibold leading-[1.4] text-app-text">
          {isNotFound ? "Задача не найдена" : "Не удалось загрузить задачу"}
        </p>
        <button
          className="self-start text-[15px] font-semibold text-app-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
          onClick={isNotFound ? onBack : onRetry}
          type="button"
        >
          {isNotFound ? "Назад" : "Повторить"}
        </button>
      </div>
    </div>
  );
}
