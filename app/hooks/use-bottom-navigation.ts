import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";

import type { TabId } from "~/components/home/bottom-navigation";
import { useTelegram } from "~/providers/telegram-provider";

const TAB_PATHS: Partial<Record<TabId, string>> = {
  home: "/",
  tasks: "/tasks",
};

export function useBottomNavigation(): (id: TabId) => void {
  const navigate = useNavigate();
  const location = useLocation();
  const { haptics } = useTelegram();

  return useCallback(
    (id: TabId) => {
      haptics.selection();

      const targetPath = TAB_PATHS[id];

      if (targetPath !== undefined && location.pathname !== targetPath) {
        void navigate(targetPath);
      }
    },
    [haptics, location.pathname, navigate],
  );
}
