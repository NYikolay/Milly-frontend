import type { ReactElement } from "react";

export function SearchEmptyCard(): ReactElement {
  return (
    <div className="rounded-[25px] bg-app-card p-[15px]">
      <div className="flex min-h-[90px] w-full flex-col items-center justify-center gap-[6px]">
        <span aria-hidden="true" className="text-[50px] leading-[1.3]">
          😔
        </span>
        <p className="text-center text-[15px] leading-[1.3] text-app-text-secondary">
          К сожалению задач не найдено
        </p>
      </div>
    </div>
  );
}
