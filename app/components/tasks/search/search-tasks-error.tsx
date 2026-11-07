import type { ReactElement } from "react";

export interface SearchTasksErrorProps {
  onRetry: () => void;
}

export function SearchTasksError({
  onRetry,
}: SearchTasksErrorProps): ReactElement {
  return (
    <div className="pt-4">
      <div
        className="flex flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px]"
        role="alert"
      >
        <p className="text-[17px] font-semibold leading-[1.4] text-app-text">
          Не удалось загрузить задачи
        </p>
        <button
          className="self-start text-[15px] font-semibold text-app-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent"
          onClick={onRetry}
          type="button"
        >
          Повторить
        </button>
      </div>
    </div>
  );
}
