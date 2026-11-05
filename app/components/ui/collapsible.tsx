import type { ReactElement, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "~/lib/cn";

export interface CollapsibleProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  duration?: number;
}

export function Collapsible({
  open,
  children,
  className,
  contentClassName,
  duration = 0.22,
}: CollapsibleProps): ReactElement {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className={cn("overflow-hidden", className)}
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          key="content"
          transition={{
            height: {
              duration: shouldReduceMotion ? 0 : duration,
              ease: "easeOut",
            },
            opacity: { duration, ease: "easeOut" },
          }}
        >
          <div className={contentClassName}>{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
