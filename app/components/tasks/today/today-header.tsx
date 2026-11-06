import type { ReactElement } from "react";

export interface TodayHeaderProps {
  title: string;
  dateLabel: string;
}

export function TodayHeader({
  title,
  dateLabel,
}: TodayHeaderProps): ReactElement {
  return (
    <header className="flex flex-col gap-[5px] px-[15px]">
      <h1 className="text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text">
        {title}
      </h1>
      <p className="text-[13px] leading-[1.4] text-app-text-secondary">
        {dateLabel}
      </p>
    </header>
  );
}
