import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import type { Variants } from "motion/react";

import { cn } from "~/lib/cn";

export type ModalVariant = "sheet" | "fade";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  labelledBy?: string;
  describedBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  variant?: ModalVariant;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const SHEET_VARIANTS: Variants = {
  initial: { opacity: 0, y: 48 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 34, mass: 0.9 },
  },
  exit: {
    opacity: 0,
    y: 40,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const FADE_VARIANTS: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.18, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const modalStack: symbol[] = [];

function pushModal(id: symbol) {
  if (!modalStack.includes(id)) {
    modalStack.push(id);
  }
}

function removeModal(id: symbol) {
  const index = modalStack.indexOf(id);
  if (index !== -1) {
    modalStack.splice(index, 1);
  }
}

function isTopModal(id: symbol) {
  return modalStack[modalStack.length - 1] === id;
}

let scrollLockCount = 0;
let previousHtmlOverflow = "";
let previousBodyOverflow = "";

function lockScroll() {
  if (scrollLockCount === 0) {
    previousHtmlOverflow = document.documentElement.style.overflow;
    previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  scrollLockCount += 1;
}

function unlockScroll() {
  if (scrollLockCount === 0) {
    return;
  }

  scrollLockCount -= 1;

  if (scrollLockCount === 0) {
    document.documentElement.style.overflow = previousHtmlOverflow;
    document.body.style.overflow = previousBodyOverflow;
  }
}

export function Modal({
  open,
  onOpenChange,
  children,
  labelledBy,
  describedBy,
  initialFocusRef,
  className,
  style,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  variant = "sheet",
}: ModalProps): ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalIdRef = useRef(Symbol("modal"));
  const onOpenChangeRef = useRef(onOpenChange);
  const closeOnEscapeRef = useRef(closeOnEscape);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    closeOnEscapeRef.current = closeOnEscape;
  }, [closeOnEscape]);

  useEffect(() => {
    if (!mounted || !open) {
      return;
    }

    const modalId = modalIdRef.current;

    pushModal(modalId);
    lockScroll();

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const frame = requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? dialogRef.current;
      target?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (!isTopModal(modalIdRef.current)) {
        return;
      }

      if (event.key === "Escape") {
        if (closeOnEscapeRef.current === true) {
          onOpenChangeRef.current(false);
        }
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const active = document.activeElement;
      const focusInside = active instanceof Node && dialog.contains(active);
      const activeIsFocusable =
        active instanceof HTMLElement && focusable.includes(active);

      if (event.shiftKey) {
        if (
          !focusInside ||
          active === first ||
          active === dialog ||
          !activeIsFocusable
        ) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (
        !focusInside ||
        active === last ||
        active === dialog ||
        !activeIsFocusable
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      removeModal(modalId);
      unlockScroll();

      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;

      if (previousFocus && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, [open, mounted]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="modal-overlay"
          className="fixed inset-0 z-50 bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={closeOnOverlayClick ? () => onOpenChange(false) : undefined}
        />
      ) : null}
      {open ? (
        <motion.div
          key="modal-dialog"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          tabIndex={-1}
          className={cn("fixed z-50 outline-none", className)}
          style={style}
          variants={variant === "sheet" ? SHEET_VARIANTS : FADE_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
