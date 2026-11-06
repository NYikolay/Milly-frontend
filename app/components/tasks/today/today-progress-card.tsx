import checkCheckIcon from "~/assets/icons/check-check.svg?no-inline";

import { AssetIcon } from "~/components/ui/asset-icon";
import { getTodayProgressCopy } from "~/lib/tasks/today-tasks";

export interface TodayProgressCardProps {
  total: number;
  completed: number;
}

export function TodayProgressCard({
  total,
  completed,
}: TodayProgressCardProps) {
  const normalized = total === 0 ? 0 : Math.min(Math.max(completed, 0), total);
  const progressWidth = total === 0 ? "0%" : `${(normalized / total) * 100}%`;
  const { title, description } = getTodayProgressCopy(total, completed);

  return (
    <div className="flex w-full flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px]">
      <div className="flex items-start gap-[10px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p className="text-[17px] font-semibold leading-[1.4] text-app-text">
            {title}
          </p>
          <p className="text-[13px] leading-[1.4] text-app-text-secondary">
            {description}
          </p>
        </div>
        <div className="flex size-[38px] shrink-0 items-center justify-center">
          <AssetIcon className="size-6 text-app-accent" src={checkCheckIcon} />
        </div>
      </div>
      <span
        aria-label="Прогресс дня"
        aria-valuemax={Math.max(total, 1)}
        aria-valuemin={0}
        aria-valuenow={normalized}
        className="block h-1 w-full overflow-hidden rounded-full bg-app-progress-track"
        role="progressbar"
      >
        <span
          className="block h-full rounded-full bg-app-accent"
          style={{ width: progressWidth }}
        />
      </span>
    </div>
  );
}
