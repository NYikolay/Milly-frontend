import cardIcon from "~/assets/icons/card.svg";
import coopIcon from "~/assets/icons/coop.svg";
import homeIcon from "~/assets/icons/home.svg";
import tasksIcon from "~/assets/icons/tasks.svg";

import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";

const TABS = [
  {
    id: "home",
    label: "Главная",
    iconSrc: homeIcon,
    iconClassName: undefined,
  },
  {
    id: "tasks",
    label: "Задачи",
    iconSrc: tasksIcon,
    iconClassName: undefined,
  },
  {
    id: "finance",
    label: "Финансы",
    iconSrc: cardIcon,
    iconClassName: undefined,
  },
  {
    id: "workspaces",
    label: "Воркспейсы",
    iconSrc: coopIcon,
    iconClassName: "h-7 w-6",
  },
] as const;

export type TabId = (typeof TABS)[number]["id"];

interface BottomNavigationProps {
  active?: TabId;
  className?: string;
  onSelect?: (id: TabId) => void;
}

export function BottomNavigation({
  active = "home",
  className,
  onSelect,
}: BottomNavigationProps) {
  return (
    <nav
      aria-label="Основная навигация"
      className={cn(
        "glass-nav flex h-[65px] items-stretch rounded-full p-[5px]",
        className,
      )}
    >
      {TABS.map(({ id, label, iconSrc, iconClassName }) => {
        const isActive = id === active;

        return (
          <button
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-full text-[13px] font-medium leading-4 tracking-[-0.08px] transition-colors active:opacity-70",
              isActive
                ? "glass-tab-active text-app-tab-accent"
                : "text-app-tab-inactive",
            )}
            key={id}
            onClick={() => onSelect?.(id)}
            type="button"
          >
            <AssetIcon className={iconClassName ?? "size-6"} src={iconSrc} />
            <span className="max-w-full truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
