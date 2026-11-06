import type { ReactElement } from "react";

import { cn } from "~/lib/cn";

import { BottomNavigation } from "./bottom-navigation";
import type { TabId } from "./bottom-navigation";

export interface BottomNavigationDockProps {
  active?: TabId;
  hidden?: boolean;
  onSelect?: (id: TabId) => void;
}

export function BottomNavigationDock({
  active,
  hidden = false,
  onSelect,
}: BottomNavigationDockProps): ReactElement {
  return (
    <div
      aria-hidden={hidden || undefined}
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none",
        hidden && "pointer-events-none translate-y-full opacity-0",
      )}
      inert={hidden}
      style={{
        paddingBottom: "max(30px, var(--app-inset-bottom))",
        paddingLeft: "var(--app-inset-left)",
        paddingRight: "var(--app-inset-right)",
      }}
    >
      <div className="mx-auto w-full max-w-md px-4">
        <BottomNavigation active={active} onSelect={onSelect} />
      </div>
    </div>
  );
}
