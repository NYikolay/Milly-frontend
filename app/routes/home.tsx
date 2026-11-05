import { useState } from "react";

import { BottomNavigation } from "~/components/home/bottom-navigation";
import { DailyProgressCard } from "~/components/home/daily-progress-card";
import { FaqSection } from "~/components/home/faq-section";
import { HomeHeader } from "~/components/home/home-header";
import { QuickAccessSection } from "~/components/home/quick-access-section";
import { QuickAddSheet } from "~/components/tasks/quick-add/quick-add-sheet";
import { VoiceRecorderSheet } from "~/components/voice/voice-recorder-sheet";
import { ApiError } from "~/lib/api/errors";
import { throwAppError } from "~/lib/errors/route-error";
import { formatTodayLabel } from "~/lib/format-date";
import { getDailyTasksSummary } from "~/lib/tasks/daily-tasks";
import { useTelegram } from "~/providers/telegram-provider";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Milly" },
    { name: "description", content: "Milly Telegram Mini App" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const state = new URL(request.url).searchParams.get("state");
  const emptyPreview = state === "empty";

  if (import.meta.env.DEV) {
    if (state === "429") {
      throwAppError(
        new ApiError("Too many requests", {
          status: 429,
          code: "rate_limited",
          requestId: "",
        }),
      );
    }

    if (state === "5xx") {
      throwAppError(
        new ApiError("Internal server error", {
          status: 500,
          code: "internal_error",
          requestId: "preview-5xx-0001",
        }),
      );
    }
  }

  const summary = emptyPreview
    ? { total: 0, completed: 0 }
    : await getDailyTasksSummary();

  return {
    summary,
    dateLabel: formatTodayLabel(),
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { haptics } = useTelegram();
  const [activeModal, setActiveModal] = useState<
    "voice" | "quick-add" | null
  >(null);
  const { summary, dateLabel } = loaderData;
  const isEmpty = summary.total === 0;
  const title = isEmpty ? "Задач на сегодня нет 😴" : "Задачи на сегодня";

  return (
    <main className="flex flex-1 flex-col">
      <div
        className="flex flex-1 flex-col gap-2 px-[15px]"
        style={{
          paddingBottom:
            "calc(89px + max(0px, 30px - var(--app-inset-bottom)))",
        }}
      >
        <HomeHeader title={title} dateLabel={dateLabel} />
        <DailyProgressCard
          completed={summary.completed}
          total={summary.total}
          onOpen={() => haptics.selection()}
        />
        <QuickAccessSection
          showSearch={!isEmpty}
          onAction={(id) => {
            haptics.impact("light");

            if (id === "voice") {
              setActiveModal("voice");
              return;
            }

            if (id === "interactive") {
              setActiveModal("quick-add");
            }
          }}
        />
        <FaqSection onAction={() => haptics.selection()} />
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-20"
        style={{
          paddingBottom: "max(30px, var(--app-inset-bottom))",
          paddingLeft: "var(--app-inset-left)",
          paddingRight: "var(--app-inset-right)",
        }}
      >
        <div className="mx-auto w-full max-w-md px-4">
          <BottomNavigation
            active="home"
            onSelect={() => haptics.selection()}
          />
        </div>
      </div>

      <VoiceRecorderSheet
        open={activeModal === "voice"}
        onOpenChange={(open) => setActiveModal(open ? "voice" : null)}
      />
      <QuickAddSheet
        open={activeModal === "quick-add"}
        onOpenChange={(open) => setActiveModal(open ? "quick-add" : null)}
      />
    </main>
  );
}
