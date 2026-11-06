import { useState } from "react";
import type { FocusEvent } from "react";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { DailyProgressCard } from "~/components/home/daily-progress-card";
import { FaqSection } from "~/components/home/faq-section";
import { HomeHeader } from "~/components/home/home-header";
import { QuickAddComposer } from "~/components/tasks/quick-add/quick-add-composer";
import { VoiceRecorderSheet } from "~/components/voice/voice-recorder-sheet";
import { useBottomNavigation } from "~/hooks/use-bottom-navigation";
import { ApiError } from "~/lib/api/errors";
import { throwAppError } from "~/lib/errors/route-error";
import { getDailyTasksSummary } from "~/lib/tasks/daily-tasks";
import { useAuth } from "~/providers/auth-provider";
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

  return { summary };
}

function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { user: authUser } = useAuth();
  const { haptics, user: telegramUser } = useTelegram();
  const onSelectTab = useBottomNavigation();
  const [activeModal, setActiveModal] = useState<"voice" | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { summary } = loaderData;
  const profile = authUser?.telegram_profile;
  const firstName = profile?.first_name || telegramUser?.first_name;
  const photoUrl = profile?.photo_url || telegramUser?.photo_url || null;
  const greeting = firstName ? `Привет, ${firstName}!` : "Привет!";

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    if (isTextEntry(event.target)) {
      setIsEditing(true);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!isTextEntry(event.target) || isTextEntry(event.relatedTarget)) {
      return;
    }

    setIsEditing(false);
  }

  return (
    <main className="flex flex-1 flex-col">
      <div
        className="flex flex-1 flex-col gap-2 px-[15px]"
        onBlur={handleBlur}
        onFocus={handleFocus}
        style={{
          paddingBottom:
            "calc(89px + max(0px, 30px - var(--app-inset-bottom)))",
        }}
      >
        <HomeHeader greeting={greeting} />
        <DailyProgressCard
          completed={summary.completed}
          total={summary.total}
          photoUrl={photoUrl}
          onOpen={() => haptics.selection()}
        />
        <QuickAddComposer
          onVoice={() => {
            haptics.impact("light");
            setActiveModal("voice");
          }}
        />
        <FaqSection onAction={() => haptics.selection()} />
      </div>

      <BottomNavigationDock
        active="home"
        hidden={isEditing}
        onSelect={onSelectTab}
      />

      <VoiceRecorderSheet
        open={activeModal === "voice"}
        onOpenChange={(open) => setActiveModal(open ? "voice" : null)}
      />
    </main>
  );
}
