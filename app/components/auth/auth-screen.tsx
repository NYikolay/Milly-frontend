import { useEffect, useId, useRef } from "react";

import logoIcon from "~/assets/icons/Logo.svg";
import type { AuthFailureReason, AuthStatus } from "~/lib/auth/types";
import { getBotUsername, openBotStartLink } from "~/lib/telegram/bot-link";
import { useTelegram } from "~/providers/telegram-provider";

const CONTAINER_CLASSES =
  "flex min-h-full w-full flex-1 flex-col items-center justify-center px-[25px] py-[24px]";
const BOOT_CONTAINER_CLASSES =
  "flex min-h-full w-full flex-1 flex-col items-center justify-center";
const CARD_CLASSES =
  "flex w-full max-w-[362px] flex-col items-center gap-[20px] rounded-[25px] bg-app-card px-[15px] py-[30px] text-center";
const TEXT_BLOCK_CLASSES = "flex w-full flex-col items-center gap-[15px]";
const ACTIONS_CLASSES = "flex w-full flex-col gap-[15px]";
const TITLE_CLASSES =
  "text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text";
const DESCRIPTION_CLASSES = "text-[15px] leading-[1.3] text-app-text-secondary";
const HINT_CLASSES = "text-[13px] leading-[1.4] text-app-hint";
const BUTTON_CLASSES =
  "flex h-[50px] w-full items-center justify-center rounded-[25px] bg-app-accent text-[15px] font-semibold text-white active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent";

export interface AuthScreenProps {
  status: Exclude<AuthStatus, "authenticated">;
  reason: AuthFailureReason | null;
  onRetry: () => void;
}

type AuthScreenErrorStatus = Exclude<AuthScreenProps["status"], "booting">;

interface AuthScreenCopy {
  title: string;
  description: string;
}

function getCopy(
  status: AuthScreenErrorStatus,
  reason: AuthFailureReason | null,
): AuthScreenCopy {
  switch (status) {
    case "connection-error":
      return reason === "server"
        ? {
            title: "Сервис временно недоступен",
            description:
              "Возникла непредвиденная ошибка во время запуска. Пожалуйста, обратитесь в службу поддержки",
          }
        : {
            title: "Нет соединения",
            description:
              "Проверьте подключение и попробуйте снова. В случае повторения ошибки пожалуйста, обратитесь в службу поддержки",
          };
    case "reauth-required":
      return {
        title: "Необходимо войти заново",
        description:
          "Сессия истекла. Откройте Milly заново через меню бота.",
      };
    case "no-init-data":
      return {
        title: "Откройте Milly из Telegram",
        description:
          "На данный момент приложение доступно только через Telegram. Пожалуйста, откройте его через бота",
      };
  }
}

export function AuthScreen({ status, reason, onRetry }: AuthScreenProps) {
  const { webApp } = useTelegram();
  const titleId = useId();
  const descriptionId = useId();
  const hintId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  const isBooting = status === "booting";

  useEffect(() => {
    if (!isBooting) {
      titleRef.current?.focus();
    }
  }, [isBooting]);

  if (status === "booting") {
    return (
      <main className={BOOT_CONTAINER_CLASSES}>
        <div
          className="flex flex-col items-center"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <img src={logoIcon} alt="" className="h-[100px] w-[100px]" />
          <h1 className="sr-only">Milly</h1>
          <p className="sr-only">Проверяем вход…</p>
        </div>
      </main>
    );
  }

  const hasBot = getBotUsername() !== null;
  const showHint = status === "no-init-data" && !hasBot;
  const copy = getCopy(status, reason);

  return (
    <main className={CONTAINER_CLASSES}>
      <div
        className={CARD_CLASSES}
        role="alert"
        aria-labelledby={titleId}
        aria-describedby={
          showHint ? `${descriptionId} ${hintId}` : descriptionId
        }
      >
        <img src={logoIcon} alt="" className="h-[50px] w-[50px]" />
        <div className={TEXT_BLOCK_CLASSES}>
          <h1
            id={titleId}
            ref={titleRef}
            tabIndex={-1}
            className={TITLE_CLASSES}
          >
            {copy.title}
          </h1>
          <p id={descriptionId} className={DESCRIPTION_CLASSES}>
            {copy.description}
          </p>
          {showHint ? (
            <p id={hintId} className={HINT_CLASSES}>
              Закройте приложение и откройте его через меню бота.
            </p>
          ) : null}
        </div>
        <div className={ACTIONS_CLASSES}>
          {status === "no-init-data" && hasBot ? (
            <button
              type="button"
              className={BUTTON_CLASSES}
              onClick={() => {
                openBotStartLink(webApp);
              }}
            >
              Открыть в боте
            </button>
          ) : (
            <button type="button" className={BUTTON_CLASSES} onClick={onRetry}>
              Повторить
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
