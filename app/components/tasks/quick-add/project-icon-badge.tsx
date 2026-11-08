import type { ReactElement } from "react";

import { AssetIcon } from "~/components/ui/asset-icon";
import { cn } from "~/lib/cn";

export interface ProjectIconBadgeProps {
  icon: string;
  colorHex: string | null;
  className?: string;
}

export function ProjectIconBadge({
  icon,
  colorHex,
  className,
}: ProjectIconBadgeProps): ReactElement {
  const isNoProject = colorHex === null;

  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full p-[5px]",
        isNoProject ? "bg-app-track text-app-text" : "text-white",
        className,
      )}
      style={isNoProject ? undefined : { backgroundColor: colorHex }}
    >
      <AssetIcon
        className={isNoProject ? "size-[20px]" : "size-[18px]"}
        src={icon}
      />
    </span>
  );
}
