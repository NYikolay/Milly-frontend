import { useEffect, useId, useRef } from "react";

import logoIcon from "~/assets/icons/Logo.svg";
import type { AuthFailureReason, AuthStatus } from "~/lib/auth/types";
import { getBotUsername, openBotStartLink } from "~/lib/telegram/bot-link";
import { useTelegram } from "~/providers/telegram-provider";

const CONTAINER_CLASSES =
  "flex min-h-full w-full flex-1 flex-col items-center justify-center px-[15px] py-[24px]";
const CARD_CLASSES =
  "flex w-full flex-col items-center gap-[15px] rounded-[25px] bg-app-card p-[24px] text-center";
const TITLE_CLASSES =
  "text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text";
const DESCRIPTION_CLASSES = "text-[15px] leading-[1.3] text-app-text-secondary";
const HINT_CLASSES = "text-[13px] leading-[1.4] text-app-hint";
const BUTTON_CLASSES =
  "flex h-[50px] w-full items-center justify-center rounded-[25px] text-[15px] font-semibold active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent";
const PRIMARY_BUTTON_CLASSES = `${BUTTON_CLASSES} bg-app-accent text-white`;
const SECONDARY_BUTTON_CLASSES = `${BUTTON_CLASSES} bg-app-bg text-app-text`;

export interface AuthScreenProps {
  status: Exclude<AuthStatus, "authenticated">;
  reason: AuthFailureReason | null;
  onRetry: () => void;
}

interface AuthScreenCopy {
  title: string;
  description: string;
}

function getCopy(
  status: AuthScreenProps["status"],
  reason: AuthFailureReason | null,
): AuthScreenCopy {
  switch (status) {
    case "booting":
      return {
        title: "Milly",
        description: "Проверяем вход…",
      };
    case "connection-error":
      return {
        title:
          reason === "server"
            ? "Сервис временно недоступен"
            : "Нет соединения",
        description: "Проверьте подключение и попробуйте снова.",
      };
    case "reauth-required":
      return {
        title: "Нужно войти заново",
        description:
          "Сессия истекла. Откройте Milly заново через меню бота.",
      };
    case "no-init-data":
      return {
        title: "Откройте Milly из Telegram",
        description:
          "Для входа нужны данные Telegram. Запустите приложение через меню бота.",
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
  const hasBot = getBotUsername() !== null;
  const showBotLink = !isBooting && status !== "connection-error" && hasBot;
  const showHint = !isBooting && status !== "connection-error" && !hasBot;
  const retryIsPrimary = status === "connection-error" || !hasBot;

  useEffect(() => {
    if (!isBooting) {
      titleRef.current?.focus();
    }
  }, [isBooting]);

  const copy = getCopy(status, reason);

  return (
    <main className={CONTAINER_CLASSES}>
      <div
        className={CARD_CLASSES}
        role={isBooting ? "status" : "alert"}
        aria-live={isBooting ? "polite" : undefined}
        aria-busy={isBooting ? true : undefined}
        aria-labelledby={isBooting ? undefined : titleId}
        aria-describedby={
          isBooting
            ? undefined
            : showHint
              ? `${descriptionId} ${hintId}`
              : descriptionId
        }
      >
        <img src={logoIcon} alt="" className="h-12 w-12" />
        <h1
          id={titleId}
          ref={titleRef}
          tabIndex={isBooting ? undefined : -1}
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
        {isBooting ? null : (
          <div className="flex w-full flex-col gap-[10px]">
            {showBotLink ? (
              <button
                type="button"
                className={PRIMARY_BUTTON_CLASSES}
                onClick={() => {
                  openBotStartLink(webApp);
                }}
              >
                Открыть Milly
              </button>
            ) : null}
            <button
              type="button"
              className={
                retryIsPrimary
                  ? PRIMARY_BUTTON_CLASSES
                  : SECONDARY_BUTTON_CLASSES
              }
              onClick={onRetry}
            >
              Повторить
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
