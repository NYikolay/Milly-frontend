import { useCallback } from "react";
import { useNavigate } from "react-router";

import type { TabId } from "~/components/home/bottom-navigation";
import { useTelegram } from "~/providers/telegram-provider";

export function useBottomNavigation(): (id: TabId) => void {
  const navigate = useNavigate();
  const { haptics } = useTelegram();

  return useCallback(
    (id: TabId) => {
      haptics.selection();

      if (id === "home") {
        void navigate("/");
      } else if (id === "tasks") {
        void navigate("/tasks");
      }
    },
    [haptics, navigate],
  );
}
