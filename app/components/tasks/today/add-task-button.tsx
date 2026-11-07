import type { ReactElement } from "react";

import editIcon from "~/assets/icons/edit.svg?no-inline";

import { AssetIcon } from "~/components/ui/asset-icon";

export interface AddTaskButtonProps {
  onClick: () => void;
}

export function AddTaskButton({ onClick }: AddTaskButtonProps): ReactElement {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-20"
      style={{
        bottom: "calc(max(30px, var(--app-inset-bottom)) + 80px)",
        paddingLeft: "var(--app-inset-left)",
        paddingRight: "var(--app-inset-right)",
      }}
    >
      <div className="mx-auto flex w-full max-w-md justify-end px-4">
        <button
          aria-label="Добавить задачу"
          className="pointer-events-auto flex size-[50px] items-center justify-center rounded-full border border-app-fab-stroke bg-app-card text-app-accent shadow-[0_0_20px_rgba(0,0,0,0.25)] active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
          onClick={onClick}
          type="button"
        >
          <AssetIcon className="size-7" src={editIcon} />
        </button>
      </div>
    </div>
  );
}
