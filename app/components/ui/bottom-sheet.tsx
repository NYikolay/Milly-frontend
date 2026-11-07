import { useEffect, useId, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  FocusEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";
import { motion, useDragControls } from "motion/react";

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
  expanded?: boolean;
  swipeToClose?: boolean;
  showCloseButton?: boolean;
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
  expanded = false,
  swipeToClose = false,
  showCloseButton = false,
}: BottomSheetProps): ReactElement {
  const titleId = useId();
  const dragControls = useDragControls();
  const [bodyScrollable, setBodyScrollable] = useState(false);
  const keyboard = useKeyboardViewport(open);
  const keyboardOpen = keyboard.keyboardInset > 0;
  const bottomOffset = keyboardOpen ? keyboard.keyboardInset : 0;
  const bottomPadding = keyboardOpen
    ? "15px"
    : "max(15px, var(--app-inset-bottom))";
  const expandedBottomPadding = keyboardOpen
    ? "0px"
    : "var(--app-inset-bottom)";
  const expandedTopPadding = "max(15px, var(--app-inset-top))";
  const panelBottomPadding = expanded ? expandedBottomPadding : bottomPadding;
  const panelMaxHeight =
    keyboardOpen && keyboard.viewportHeight !== null
      ? `calc(${keyboard.viewportHeight}px - var(--app-inset-top) - 90px)`
      : "calc(var(--tg-viewport-stable-height, 100dvh) - var(--app-inset-top) - var(--app-inset-bottom) - 90px)";
  const expandedHeight =
    keyboardOpen && keyboard.viewportHeight !== null
      ? `calc(${keyboard.viewportHeight}px - ${expandedTopPadding})`
      : `calc(var(--tg-viewport-stable-height, 100dvh) - ${expandedTopPadding} - ${expandedBottomPadding})`;
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

  useEffect(() => {
    if (!open || !swipeToClose) {
      setBodyScrollable(false);
      return;
    }

    let observer: ResizeObserver | null = null;

    const frame = window.requestAnimationFrame(() => {
      const body = bodyRef.current;

      if (!body) {
        return;
      }

      const update = () => {
        setBodyScrollable(body.scrollHeight - body.clientHeight > 1);
      };

      update();

      if (typeof ResizeObserver === "undefined") {
        return;
      }

      observer = new ResizeObserver(update);
      observer.observe(body);

      for (const child of Array.from(body.children)) {
        observer.observe(child);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [open, swipeToClose]);

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

  function handleHeaderPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!swipeToClose || event.button !== 0) {
      return;
    }

    const target = event.target;

    if (target instanceof Element && target.closest("button")) {
      return;
    }

    dragControls.start(event);
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
        paddingBottom: panelBottomPadding,
      }}
    >
      <motion.div
        layout={panelAnimateLayout && !keyboardOpen}
        drag={swipeToClose ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragControls={dragControls}
        dragElastic={{ top: 0, bottom: 0.6 }}
        dragListener={swipeToClose && !bodyScrollable}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 600) {
            onOpenChange(false);
          }
        }}
        className={cn(
          "relative flex w-full flex-col overflow-hidden rounded-[25px] bg-app-card",
          panelClassName,
        )}
        style={{
          height: expanded
            ? expandedHeight
            : panelHeight === "auto"
              ? undefined
              : panelHeight,
          maxHeight: expanded ? expandedHeight : panelMaxHeight,
        }}
      >
        <SheetHeader
          titleId={titleId}
          title={title}
          onBack={onBack}
          onClose={showCloseButton ? () => onOpenChange(false) : undefined}
          onPointerDown={
            swipeToClose && bodyScrollable
              ? handleHeaderPointerDown
              : undefined
          }
        />
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
