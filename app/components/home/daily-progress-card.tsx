import { Link } from "react-router";

import chevronRightIcon from "~/assets/icons/chevron_right.svg";

import { AssetIcon } from "~/components/ui/asset-icon";
import { Skeleton } from "~/components/ui/skeleton";
import { normalizeCompleted } from "~/lib/tasks/today-tasks";

export type DailyProgressCardStatus = "ready" | "loading" | "error";

export interface DailyProgressCardProps {
  completed: number;
  total: number;
  photoUrl?: string | null;
  status?: DailyProgressCardStatus;
  onOpen?: () => void;
}

export function DailyProgressCard({
  completed,
  total,
  photoUrl,
  status = "ready",
  onOpen,
}: DailyProgressCardProps) {
  const normalizedCompleted = normalizeCompleted(total, completed);
  const progressWidth =
    total === 0 ? "7px" : `${(normalizedCompleted / total) * 100}%`;
  const title = total === 0 ? "Чем займёмся?" : "Всё идёт по плану";
  const description =
    total === 0
      ? "Создайте первую задачу на сегодня"
      : `${normalizedCompleted} из ${total} задач выполнено`;

  return (
    <Link
      aria-busy={status === "loading" || undefined}
      className="flex w-full flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px] text-left active:opacity-70"
      onClick={onOpen}
      to="/tasks"
    >
      <span className="flex w-full items-center gap-[10px]">
        {photoUrl ? (
          <img
            alt=""
            className="size-[30px] shrink-0 rounded-full object-cover"
            src={photoUrl}
          />
        ) : null}
        <span className="min-w-0 flex flex-1 flex-col">
          {status === "loading" ? (
            <>
              <span className="sr-only">Загружаем прогресс</span>
              <Skeleton className="h-[24px] w-1/2 rounded-[8px]" />
              <Skeleton className="mt-[3px] h-[18px] w-2/3 rounded-[6px]" />
            </>
          ) : status === "error" ? (
            <>
              <span className="text-[17px] font-semibold leading-[1.4] text-app-text">
                Не удалось загрузить прогресс
              </span>
              <span className="mt-[3px] text-[13px] leading-[1.4] text-app-text-secondary">
                Откройте задачи и повторите попытку
              </span>
            </>
          ) : (
            <>
              <span className="text-[17px] font-semibold leading-[1.4] text-app-text">
                {title}
              </span>
              <span className="mt-[3px] text-[13px] leading-[1.4] text-app-text-secondary">
                {description}
              </span>
            </>
          )}
        </span>
        <AssetIcon
          className="size-6 shrink-0 text-app-text-secondary"
          src={chevronRightIcon}
        />
      </span>
      {status === "ready" ? (
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
      ) : (
        <span
          aria-hidden="true"
          className="block h-1 w-full overflow-hidden rounded-full bg-app-track"
        >
          {status === "loading" ? (
            <Skeleton className="h-full w-1/3 rounded-full" />
          ) : null}
        </span>
      )}
    </Link>
  );
}
