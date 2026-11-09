import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Toaster } from "sonner";

const TOAST_DURATION_MS = 3000;
const TOAST_EDGE_OFFSET = 15;
const TOAST_OFFSET = {
  bottom: "calc(max(30px, var(--app-inset-bottom)) + 70px)",
  left: TOAST_EDGE_OFFSET,
  right: TOAST_EDGE_OFFSET,
};

export function AppToaster(): ReactElement | null {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Toaster
      containerAriaLabel="Уведомления"
      duration={TOAST_DURATION_MS}
      gap={10}
      mobileOffset={TOAST_OFFSET}
      offset={TOAST_OFFSET}
      position="bottom-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-[10px] rounded-[25px] border border-app-stroke bg-app-card p-[15px] shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
          content: "flex min-w-0 flex-1 flex-col",
          title: "text-[15px] font-medium leading-[1.3] text-app-text",
          icon: "flex size-5 shrink-0 items-center justify-center text-app-success",
        },
      }}
    />
  );
}
