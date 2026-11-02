import type { ButtonHTMLAttributes } from "react";

import { cn } from "~/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-tg-button text-tg-button-text",
  secondary: "bg-tg-secondary-bg text-tg-text",
  ghost: "text-tg-link",
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-opacity active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
