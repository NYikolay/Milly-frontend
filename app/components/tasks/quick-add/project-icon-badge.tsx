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
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full p-[5px]",
        colorHex === null ? "bg-app-track text-app-text" : "text-white",
        className,
      )}
      style={colorHex === null ? undefined : { backgroundColor: colorHex }}
    >
      <AssetIcon className="size-[18px]" src={icon} />
    </span>
  );
}
