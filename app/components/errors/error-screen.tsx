import { useEffect, useId, useRef } from "react";
import type { ReactElement } from "react";

import logoIcon from "~/assets/icons/Logo.svg";
import type { AppErrorDescriptor } from "~/lib/errors/app-error";
import { getAppErrorCopy } from "~/lib/errors/copy";
import { CONTENT_BOTTOM_PADDING } from "~/lib/layout";

const CARD_CLASSES =
  "flex w-full max-w-[362px] flex-col items-center gap-[20px] rounded-[25px] bg-app-card px-[15px] py-[30px] text-center [@media(max-height:620px)]:py-[20px]";
const TEXT_BLOCK_CLASSES = "flex w-full flex-col items-center gap-[15px]";
const DESCRIPTION_GROUP_CLASSES =
  "flex w-full flex-col items-center gap-[15px]";
const DESCRIPTION_CLASSES =
  "text-[15px] leading-[1.3] text-app-text-secondary";
const TITLE_CLASSES =
  "text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text";
const ACTIONS_CLASSES = "flex w-full flex-col gap-[15px]";
const PRIMARY_BUTTON_CLASSES =
  "flex h-[50px] w-full items-center justify-center rounded-[25px] bg-app-accent text-[15px] font-semibold text-white active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:opacity-60";
const SECONDARY_BUTTON_CLASSES =
  "-my-[13px] flex min-h-[44px] items-center justify-center text-[15px] font-semibold text-app-accent active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent";
const HINT_CLASSES =
  "max-w-full break-words text-[13px] leading-[1.4] text-app-text-secondary";

export interface ErrorScreenProps {
  descriptor: AppErrorDescriptor;
  onHome: () => void;
  onBack: () => void;
  onRetry: () => void;
  retryPending?: boolean;
}

export function ErrorScreen({
  descriptor,
  onHome,
  onBack,
  onRetry,
  retryPending = false,
}: ErrorScreenProps): ReactElement {
  const titleId = useId();
  const descriptionId = useId();
  const hintId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  const copy = getAppErrorCopy(descriptor);
  const hasHint = copy.hint.length > 0;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (retryPending) {
      titleRef.current?.focus();
    }
  }, [retryPending]);

  return (
    <main
      className="relative flex flex-1 flex-col overflow-y-auto px-[25px] pt-[24px]"
      style={{
        paddingBottom: CONTENT_BOTTOM_PADDING,
      }}
    >
      <div
        className={`grid min-h-0 w-full max-w-[362px] flex-1 justify-items-center mx-auto ${
          hasHint
            ? "grid-rows-[minmax(0,1fr)_auto_minmax(57px,1fr)] [@media(max-height:620px)]:grid-rows-[minmax(0,1fr)_auto_minmax(57px,auto)]"
            : "grid-rows-[minmax(0,1fr)_auto_minmax(0px,1fr)]"
        }`}
      >
        <div
          className={`col-start-1 row-start-2 ${CARD_CLASSES}`}
          role="alert"
          aria-labelledby={titleId}
          aria-describedby={
            hasHint ? `${descriptionId} ${hintId}` : descriptionId
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
            <div id={descriptionId} className={DESCRIPTION_GROUP_CLASSES}>
              {copy.description.map((paragraph) => (
                <p key={paragraph} className={DESCRIPTION_CLASSES}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          <div className={ACTIONS_CLASSES}>
            {copy.primaryAction === "home" ? (
              <button
                type="button"
                className={PRIMARY_BUTTON_CLASSES}
                onClick={onHome}
              >
                {copy.primaryLabel}
              </button>
            ) : (
              <button
                type="button"
                className={PRIMARY_BUTTON_CLASSES}
                onClick={onRetry}
                disabled={retryPending}
                aria-busy={retryPending}
              >
                {copy.primaryLabel}
              </button>
            )}
            <button
              type="button"
              className={SECONDARY_BUTTON_CLASSES}
              onClick={onBack}
            >
              {copy.secondaryLabel}
            </button>
          </div>
        </div>
        {hasHint ? (
          <div
            id={hintId}
            className="col-start-1 row-start-3 mt-[15px] flex w-full min-w-0 flex-col items-center gap-[5px] self-start"
          >
            {copy.hint.map((line) => (
              <p key={line} className={HINT_CLASSES}>
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
