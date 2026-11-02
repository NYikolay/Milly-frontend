import type { ReactElement } from "react";

export function MicIcon({
  className,
}: {
  className?: string;
}): ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 44 44"
      fill="none"
      className={className}
    >
      <rect
        x="15.5"
        y="7.5"
        width="13"
        height="22"
        rx="6.5"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path
        d="M10 21.5a12 12 0 0 0 24 0"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path
        d="M22 33.5V38"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
