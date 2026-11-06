import type { ReactElement } from "react";

export function TodayTasksSkeleton(): ReactElement {
  return (
    <div
      aria-busy="true"
      aria-label="Загружаем задачи"
      className="flex flex-1 flex-col gap-2 animate-pulse"
    >
      <div className="pb-[15px] pt-[15px]">
        <div className="h-[50px] rounded-[36px] bg-app-card" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="mx-[15px] mt-[15px] h-[29px] w-2/3 rounded bg-app-card" />
        <div className="mx-[15px] h-[18px] w-1/3 rounded bg-app-card" />
        <div className="h-[89px] rounded-[25px] bg-app-card" />
      </div>
      <div className="h-[231px] rounded-[25px] bg-app-card" />
      <div className="h-[164px] rounded-[25px] bg-app-card" />
    </div>
  );
}
