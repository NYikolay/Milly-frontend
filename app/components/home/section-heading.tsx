import type { ReactNode } from "react";

export function SectionHeading({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <h2
      className="px-[15px] text-[15px] font-semibold leading-[18px] text-app-text-secondary"
      id={id}
    >
      {children}
    </h2>
  );
}
