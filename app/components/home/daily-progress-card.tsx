import chevronRightIcon from "~/assets/icons/chevron_right.svg";

import { AssetIcon } from "~/components/ui/asset-icon";

export interface DailyProgressCardProps {
  completed: number;
  total: number;
  onOpen?: () => void;
}

export function DailyProgressCard({
  completed,
  total,
  onOpen,
}: DailyProgressCardProps) {
  const normalizedCompleted =
    total === 0 ? 0 : Math.min(Math.max(completed, 0), total);
  const progressWidth =
    total === 0 ? "7px" : `${(normalizedCompleted / total) * 100}%`;
  const title = total === 0 ? "Чем займёмся?" : "Всё идёт по плану";
  const description =
    total === 0
      ? "Создайте первую задачу на сегодня"
      : `${normalizedCompleted} из ${total} задач выполнено`;

  return (
    <div className="flex w-full flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px]">
      <button
        className="flex w-full items-center justify-between gap-2 text-left active:opacity-70"
        onClick={onOpen}
        type="button"
      >
        <span className="min-w-0 flex flex-col">
          <span className="text-[17px] font-semibold leading-[1.4] text-app-text">
            {title}
          </span>
          <span className="mt-[3px] text-[13px] leading-[1.4] text-app-text-secondary">
            {description}
          </span>
        </span>
        <AssetIcon
          className="size-6 shrink-0 text-app-text-secondary"
          src={chevronRightIcon}
        />
      </button>
      <span
        aria-label="Прогресс дня"
        aria-valuemax={Math.max(total, 1)}
        aria-valuemin={0}
        aria-valuenow={normalizedCompleted}
        className="block h-1 w-full overflow-hidden rounded-full bg-app-track"
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
