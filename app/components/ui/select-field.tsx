import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

import checkIcon from "~/assets/icons/check.svg";
import chevronDownIcon from "~/assets/icons/chevron-down.svg";
import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";

const POPUP_WIDTH = 336;
const POPUP_GUTTER = 15;
const POPUP_GAP = 8;
const OPTION_HEIGHT = 54;
const POPUP_VERTICAL_PADDING = 30;

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

export interface SelectFieldProps<T extends string | number> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

interface PopupPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

function getPopupPosition(
  trigger: HTMLElement,
  optionCount: number,
): PopupPosition {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.max(0, Math.min(POPUP_WIDTH, viewportWidth - 30));
  const left = Math.max(
    POPUP_GUTTER,
    Math.min(rect.left, viewportWidth - width - POPUP_GUTTER),
  );
  const estimatedHeight = optionCount * OPTION_HEIGHT + POPUP_VERTICAL_PADDING;
  const spaceBelow = viewportHeight - rect.bottom - POPUP_GUTTER;
  const spaceAbove = rect.top - POPUP_GUTTER;
  const placeAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
  const top = placeAbove
    ? Math.max(POPUP_GUTTER, rect.top - estimatedHeight - POPUP_GAP)
    : rect.bottom + POPUP_GAP;
  const maxHeight = Math.max(
    OPTION_HEIGHT,
    placeAbove ? spaceAbove - POPUP_GAP : viewportHeight - top - POPUP_GUTTER,
  );

  return { top, left, width, maxHeight };
}

export function SelectField<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SelectFieldProps<T>): ReactElement {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value);

  const selectOption = useCallback(
    (option: SelectOption<T>) => {
      onChange(option.value);
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    },
    [onChange],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        triggerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    }

    function handleScroll(event: Event) {
      const target = event.target;

      if (target instanceof Node && listRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function handleResize() {
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted || !open) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const selectedIndex = options.findIndex(
        (option) => option.value === value,
      );
      const index = selectedIndex === -1 ? 0 : selectedIndex;

      optionRefs.current[index]?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [mounted, open, options, value]);

  useEffect(() => {
    if (!mounted || !open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();

        if (options.length === 0) {
          return;
        }

        const delta = event.key === "ArrowDown" ? 1 : -1;
        const currentIndex = optionRefs.current.findIndex(
          (option) => option === document.activeElement,
        );
        const nextIndex =
          currentIndex === -1
            ? delta === 1
              ? 0
              : options.length - 1
            : (currentIndex + delta + options.length) % options.length;

        optionRefs.current[nextIndex]?.focus({ preventScroll: true });
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        const currentIndex = optionRefs.current.findIndex(
          (option) => option === document.activeElement,
        );
        const option = options[currentIndex];

        if (!option) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        selectOption(option);
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);

    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [mounted, open, options, selectOption]);

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }

    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    setPosition(getPopupPosition(trigger, options.length));
    setOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cn(
          "flex h-[49px] w-full items-center justify-between gap-[10px] rounded-[25px] bg-app-track px-[15px] text-left text-[15px] text-app-text transition-colors active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent",
          className,
        )}
        onClick={handleToggle}
        type="button"
      >
        <span className="truncate">{selectedOption?.label ?? ""}</span>
        <AssetIcon className="size-[18px] shrink-0" src={chevronDownIcon} />
      </button>
      {mounted
        ? createPortal(
            <AnimatePresence>
              {open && position ? (
                <motion.div
                  ref={listRef}
                  animate={{ opacity: 1, scale: 1 }}
                  aria-label={ariaLabel}
                  className="fixed z-[60] overflow-y-auto overscroll-contain rounded-[25px] bg-app-card p-[15px]"
                  exit={{ opacity: 0, scale: 0.96 }}
                  id={listboxId}
                  initial={{ opacity: 0, scale: 0.96 }}
                  role="listbox"
                  style={{
                    top: position.top,
                    left: position.left,
                    width: position.width,
                    maxHeight: position.maxHeight,
                    transformOrigin: "top",
                    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25)",
                  }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  {options.map((option, index) => {
                    const isSelected = option.value === value;

                    return (
                      <button
                        key={String(option.value)}
                        ref={(element) => {
                          optionRefs.current[index] = element;
                        }}
                        aria-selected={isSelected}
                        className={cn(
                          "flex h-[54px] w-full items-center justify-between gap-[10px] text-left text-[15px] text-app-text transition-colors active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent",
                          index < options.length - 1 &&
                            "border-b border-app-stroke",
                        )}
                        onClick={() => selectOption(option)}
                        role="option"
                        type="button"
                      >
                        <span className="truncate">{option.label}</span>
                        {isSelected ? (
                          <AssetIcon
                            className="size-6 shrink-0 text-app-accent"
                            src={checkIcon}
                          />
                        ) : (
                          <span aria-hidden="true" className="size-6 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
