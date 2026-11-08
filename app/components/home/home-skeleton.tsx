import type { ReactElement } from "react";

import logoIcon from "~/assets/icons/Logo.svg";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/cn";
import { CONTENT_BOTTOM_PADDING } from "~/lib/layout";

const FAQ_ROW_INDEXES = [0, 1];

export function HomeSkeleton(): ReactElement {
  return (
    <div
      aria-busy="true"
      aria-label="Загружаем главный экран"
      className="flex flex-1 flex-col"
      role="status"
    >
      <div
        className="flex flex-1 flex-col gap-2 px-[15px]"
        style={{
          paddingBottom: CONTENT_BOTTOM_PADDING,
        }}
      >
        <header className="flex flex-col items-center gap-[5px] pb-[15px] pt-[15px]">
          <img alt="" className="size-[50px]" src={logoIcon} />
          <Skeleton className="h-[29px] w-[180px] rounded-[10px]" />
        </header>

        <div className="flex w-full flex-col gap-[10px] rounded-[25px] bg-app-card p-[15px]">
          <div className="flex w-full items-center gap-[10px]">
            <Skeleton className="size-[30px] shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <Skeleton className="h-[24px] w-1/2 rounded-[8px]" />
              <Skeleton className="h-[18px] w-2/3 rounded-[6px]" />
            </div>
            <Skeleton className="size-6 shrink-0 rounded-full" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
        </div>

        <section className="flex flex-col gap-[10px] pt-[15px]">
          <Skeleton className="mx-[15px] h-[18px] w-[160px] rounded-[6px]" />
          <div className="flex flex-col gap-[10px]">
            <div className="flex h-[104px] w-full flex-col gap-[10px] rounded-[25px] border border-app-stroke bg-app-card p-[15px]">
              <Skeleton className="h-[18px] w-3/4 rounded-[6px]" />
              <Skeleton className="h-[18px] w-1/2 rounded-[6px]" />
            </div>
            <div className="flex gap-[5px] overflow-hidden">
              <Skeleton className="h-[45px] w-[118px] shrink-0 rounded-[50px]" />
              <Skeleton className="h-[45px] w-[92px] shrink-0 rounded-[50px]" />
              <Skeleton className="h-[45px] w-[104px] shrink-0 rounded-[50px]" />
              <Skeleton className="h-[45px] w-[45px] shrink-0 rounded-[50px]" />
              <Skeleton className="h-[45px] w-[120px] shrink-0 rounded-[50px]" />
            </div>
            <div className="flex items-center gap-[10px]">
              <Skeleton className="h-[50px] flex-1 rounded-[25px]" />
              <Skeleton className="size-[50px] shrink-0 rounded-full" />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2 pt-[15px]">
          <Skeleton className="mx-[15px] h-[18px] w-[34px] rounded-[6px]" />
          <div className="rounded-[25px] bg-app-card p-[15px]">
            {FAQ_ROW_INDEXES.map((index) => (
              <div
                className="flex h-[67px] w-full items-center gap-3"
                key={index}
              >
                <Skeleton className="size-[35px] shrink-0 rounded-[10px]" />
                <div
                  className={cn(
                    "flex h-full min-w-0 flex-1 items-center gap-3",
                    index < FAQ_ROW_INDEXES.length - 1 &&
                      "border-b border-app-stroke",
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                    <Skeleton className="h-[15px] w-1/3 rounded-[5px]" />
                    <Skeleton className="h-[13px] w-1/2 rounded-[5px]" />
                  </div>
                  <Skeleton className="size-6 shrink-0 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
