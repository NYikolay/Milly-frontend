import type { ReactElement } from "react";

import editIcon from "~/assets/icons/edit.svg?no-inline";

import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";

export interface AddTaskButtonProps {
  onClick: () => void;
  hidden?: boolean;
}

export function AddTaskButton({
  onClick,
  hidden = false,
}: AddTaskButtonProps): ReactElement {
  return (
    <div
      aria-hidden={hidden || undefined}
      className={cn(
        "pointer-events-none fixed inset-x-0 z-20 transition-opacity duration-200 ease-out motion-reduce:transition-none",
        hidden && "opacity-0",
      )}
      inert={hidden}
      style={{
        bottom: "calc(max(30px, var(--app-inset-bottom)) + 80px)",
        paddingLeft: "var(--app-inset-left)",
        paddingRight: "var(--app-inset-right)",
      }}
    >
      <div className="mx-auto flex w-full max-w-md justify-end px-4">
        <button
          aria-label="Добавить задачу"
          className={cn(
            "flex size-[50px] items-center justify-center rounded-full border border-app-fab-stroke bg-app-card text-app-accent shadow-[0_0_20px_rgba(0,0,0,0.25)] active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent",
            hidden ? "pointer-events-none" : "pointer-events-auto",
          )}
          onClick={onClick}
          type="button"
        >
          <AssetIcon className="size-7" src={editIcon} />
        </button>
      </div>
    </div>
  );
}
