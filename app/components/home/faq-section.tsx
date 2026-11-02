import chevronRightIcon from "~/assets/icons/chevron_right.svg";
import excelLogo from "~/assets/icons/excel_logo.svg";
import logoIcon from "~/assets/icons/Logo.svg";

import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";

import { SectionHeading } from "./section-heading";

export type FaqActionId = "about" | "export";

interface FaqSectionProps {
  onAction?: (id: FaqActionId) => void;
}

const FAQ_ITEMS = [
  {
    id: "about",
    title: "Milly",
    description: "Изучите возможности приложения",
    icon: logoIcon,
  },
  {
    id: "export",
    title: "Экспорт данных",
    description: "Выгрузка данных в удобный формат",
    icon: excelLogo,
  },
] as const;

export function FaqSection({ onAction }: FaqSectionProps) {
  return (
    <section
      aria-labelledby="faq-title"
      className="flex flex-col gap-2 pt-[15px]"
    >
      <SectionHeading id="faq-title">FAQ</SectionHeading>
      <div className="rounded-[25px] bg-app-card p-[15px]">
        {FAQ_ITEMS.map((item, index) => (
          <button
            className="flex h-[67px] w-full items-center gap-3 text-left active:opacity-70"
            key={item.id}
            onClick={() => onAction?.(item.id)}
            type="button"
          >
            <img alt="" className="size-[35px] shrink-0" src={item.icon} />
            <span
              className={cn(
                "flex h-full min-w-0 flex-1 items-center gap-3",
                index < FAQ_ITEMS.length - 1 && "border-b border-app-stroke",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-[1.3] text-app-text">
                  {item.title}
                </span>
                <span className="mt-[6px] block text-[13px] leading-[1.4] text-app-text-secondary">
                  {item.description}
                </span>
              </span>
              <AssetIcon
                className="size-6 shrink-0 text-app-text-secondary"
                src={chevronRightIcon}
              />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
