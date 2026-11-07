import type { ReactElement } from "react";

export function SearchHeader(): ReactElement {
  return (
    <header className="flex flex-col gap-[5px] px-[15px]">
      <h1 className="text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text">
        Поиск задач
      </h1>
      <p className="text-[13px] leading-[1.4] text-app-text-secondary">
        Ищите, фильтруйте и сортируйте старые или новые задачи
      </p>
    </header>
  );
}
