import { useEffect, useId, useRef } from "react";
import type {
  ButtonHTMLAttributes,
  FocusEvent,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";
import { motion } from "motion/react";

import { Modal } from "~/components/ui/modal";
import { SheetHeader } from "~/components/ui/sheet-header";
import { useKeyboardViewport } from "~/hooks/use-keyboard-viewport";
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
  onBack?: () => void;
  panelHeight?: number | "auto";
  panelAnimateLayout?: boolean;
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
  onBack,
  panelHeight = "auto",
  panelAnimateLayout = false,
}: BottomSheetProps): ReactElement {
  const titleId = useId();
  const keyboard = useKeyboardViewport(open);
  const keyboardOpen = keyboard.keyboardInset > 0;
  const bottomOffset = keyboardOpen ? keyboard.keyboardInset : 0;
  const bottomPadding = keyboardOpen
    ? "15px"
    : "max(15px, var(--app-inset-bottom))";
  const panelMaxHeight =
    keyboardOpen && keyboard.viewportHeight !== null
      ? `calc(${keyboard.viewportHeight}px - var(--app-inset-top) - 90px)`
      : "calc(var(--tg-viewport-stable-height, 100dvh) - var(--app-inset-top) - var(--app-inset-bottom) - 90px)";
  const bodyRef = useRef<HTMLDivElement>(null);
  const focusFrameRef = useRef(0);

  useEffect(() => {
    return () => window.cancelAnimationFrame(focusFrameRef.current);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const body = bodyRef.current;
      const active = document.activeElement;

      if (body && active instanceof HTMLElement && body.contains(active)) {
        active.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, keyboard.keyboardInset, keyboard.viewportHeight]);

  function handleBodyFocus(event: FocusEvent<HTMLDivElement>) {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    window.cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = window.requestAnimationFrame(() => {
      if (document.activeElement === target) {
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }

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
      className="fixed inset-x-0 z-50 mx-auto flex w-full flex-col gap-[10px]"
      style={{
        bottom: bottomOffset,
        maxWidth:
          "calc(448px + max(15px, var(--app-inset-left)) + max(15px, var(--app-inset-right)))",
        paddingLeft: "max(15px, var(--app-inset-left))",
        paddingRight: "max(15px, var(--app-inset-right))",
        paddingBottom: bottomPadding,
      }}
    >
      <motion.div
        layout={panelAnimateLayout && !keyboardOpen}
        className={cn(
          "relative flex w-full flex-col overflow-hidden rounded-[25px] bg-app-card",
          panelClassName,
        )}
        style={{
          height: panelHeight === "auto" ? undefined : panelHeight,
          maxHeight: panelMaxHeight,
        }}
      >
        <SheetHeader titleId={titleId} title={title} onBack={onBack} />
        <div
          ref={bodyRef}
          onFocus={handleBodyFocus}
          className={cn(
            "flex min-h-0 flex-auto flex-col overflow-y-auto overscroll-contain",
            bodyClassName,
          )}
        >
          {children}
        </div>
      </motion.div>
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
        "flex h-[50px] w-full items-center justify-center rounded-[25px] bg-app-card text-[15px] font-semibold text-app-accent transition-opacity active:opacity-70 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent",
        className,
      )}
      {...props}
    />
  );
}

export function BottomSheetPrimaryAction({
  className,
  type = "button",
  ...props
}: BottomSheetActionProps): ReactElement {
  return (
    <button
      type={type}
      className={cn(
        "flex h-[50px] w-full items-center justify-center rounded-[25px] bg-app-accent text-[15px] font-semibold text-white transition-opacity active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent",
        className,
      )}
      {...props}
    />
  );
}
