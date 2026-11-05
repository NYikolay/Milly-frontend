import type { ReactElement } from "react";

import chevronLeftIcon from "~/assets/icons/chevron-left.svg";
import { AssetIcon } from "~/components/ui/asset-icon";

export interface SheetHeaderProps {
  titleId: string;
  title: string;
  onClose?: () => void;
  onBack?: () => void;
  closeLabel?: string;
  backLabel?: string;
}

const ICON_BUTTON_CLASSES =
  "relative flex size-11 -m-[10px] items-center justify-center rounded-full text-app-text active:opacity-70 focus-visible:outline-2 focus-visible:outline-app-accent";

function CloseIcon(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      className="size-6"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function SheetHeader({
  titleId,
  title,
  onClose,
  onBack,
  closeLabel = "Закрыть",
  backLabel = "Назад",
}: SheetHeaderProps): ReactElement {
  return (
    <div className="relative flex h-[54px] shrink-0 items-center justify-between border-b border-app-stroke px-[15px]">
      {onBack ? (
        <button
          aria-label={backLabel}
          className={ICON_BUTTON_CLASSES}
          onClick={onBack}
          type="button"
        >
          <AssetIcon className="size-6" src={chevronLeftIcon} />
        </button>
      ) : (
        <span aria-hidden="true" className="size-6" />
      )}
      <h2
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[17px] font-semibold leading-[1.4] text-app-text"
        id={titleId}
      >
        {title}
      </h2>
      {onClose ? (
        <button
          aria-label={closeLabel}
          className={ICON_BUTTON_CLASSES}
          onClick={onClose}
          type="button"
        >
          <CloseIcon />
        </button>
      ) : (
        <span aria-hidden="true" className="size-6" />
      )}
    </div>
  );
}
