import microIcon from "~/assets/icons/micro.svg";
import { AssetIcon } from "~/components/ui/asset-icon";

import { SectionHeading } from "./section-heading";

export type QuickActionId = "voice" | "interactive" | "search";

interface QuickAccessSectionProps {
  showSearch: boolean;
  onAction?: (id: QuickActionId) => void;
}

const ACTIONS: {
  id: QuickActionId;
  title: string;
  description: string;
}[] = [
  {
    id: "voice",
    title: "Голосом",
    description: "Опишите словами задачу, мы добавим её в ваш список дел",
  },
  {
    id: "interactive",
    title: "Интерактивно",
    description: "Заполните форму для добавления задачи",
  },
  {
    id: "search",
    title: "Поиск задач",
    description: "Ищите, фильтруйте и сортируйте ваши задачи",
  },
];

function QuickActionIcon({ id }: { id: QuickActionId }) {
  if (id === "voice") {
    return (
      <span
        aria-hidden="true"
        className="flex size-[50px] items-center justify-center rounded-full bg-app-accent-soft"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-app-accent text-white shadow-[0_2px_6px_rgba(0,122,255,0.35)]">
          <AssetIcon className="size-[25px]" src={microIcon} />
        </span>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex size-[50px] items-center justify-center text-[44px] leading-none"
    >
      {id === "interactive" ? "📝" : "🔍"}
    </span>
  );
}

export function QuickAccessSection({
  showSearch,
  onAction,
}: QuickAccessSectionProps) {
  const actions = showSearch
    ? ACTIONS
    : ACTIONS.filter((action) => action.id !== "search");

  return (
    <section
      aria-labelledby="quick-access-title"
      className="flex flex-col gap-2 pt-[15px]"
    >
      <SectionHeading id="quick-access-title">Быстрый доступ</SectionHeading>
      <div className="grid grid-cols-2 gap-x-[10px] gap-y-2">
        {actions.map((action) => (
          <button
            className="flex h-full min-h-[165px] flex-col items-center rounded-[25px] bg-app-card p-[15px] text-center active:opacity-70"
            key={action.id}
            onClick={() => onAction?.(action.id)}
            type="button"
          >
            <QuickActionIcon id={action.id} />
            <span className="mt-[10px] flex w-full flex-col items-center gap-[5px]">
              <span className="text-[15px] font-semibold leading-[18px] text-app-text">
                {action.title}
              </span>
              <span className="text-[12px] leading-[1.4] text-app-text-secondary">
                {action.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
