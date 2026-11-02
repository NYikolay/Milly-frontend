import { useId } from "react";
import type {
  ButtonHTMLAttributes,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";

import { Modal } from "~/components/ui/modal";
import { cn } from "~/lib/cn";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  describedBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  panelClassName?: string;
  bodyClassName?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
  describedBy,
  initialFocusRef,
  panelClassName,
  bodyClassName,
  closeOnOverlayClick,
  closeOnEscape,
}: BottomSheetProps): ReactElement {
  const titleId = useId();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      labelledBy={titleId}
      describedBy={describedBy}
      initialFocusRef={initialFocusRef}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-md flex-col gap-[10px]"
      style={{
        paddingLeft: "max(15px, var(--app-inset-left))",
        paddingRight: "max(15px, var(--app-inset-right))",
        paddingBottom: "max(15px, var(--app-inset-bottom))",
      }}
    >
      <div
        className={cn(
          "relative flex h-[380px] w-full flex-col overflow-hidden rounded-[25px] bg-app-card p-[15px]",
          panelClassName,
        )}
        style={{
          maxHeight:
            "calc(var(--tg-viewport-stable-height, 100dvh) - var(--app-inset-top) - var(--app-inset-bottom) - 90px)",
        }}
      >
        <h2
          id={titleId}
          className="shrink-0 text-center text-[17px] font-semibold leading-[1.4] text-app-text"
        >
          {title}
        </h2>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain",
            bodyClassName,
          )}
        >
          {children}
        </div>
      </div>
      {footer != null ? <div className="shrink-0">{footer}</div> : null}
    </Modal>
  );
}

export interface BottomSheetActionProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {}

export function BottomSheetAction({
  className,
  type = "button",
  ...props
}: BottomSheetActionProps): ReactElement {
  return (
    <button
      type={type}
      className={cn(
        "flex h-[50px] w-full items-center justify-center rounded-[25px] bg-app-card text-[15px] font-semibold text-app-accent transition-opacity active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent",
        className,
      )}
      {...props}
    />
  );
}
