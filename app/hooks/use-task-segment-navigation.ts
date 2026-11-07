import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";

import type { TaskSegmentId } from "~/components/tasks/task-segments";
import { useTelegram } from "~/providers/telegram-provider";

const SEGMENT_PATHS: Partial<Record<TaskSegmentId, string>> = {
  today: "/tasks",
  search: "/tasks/search",
};

export function useTaskSegmentNavigation(): (id: TaskSegmentId) => void {
  const navigate = useNavigate();
  const location = useLocation();
  const { haptics } = useTelegram();

  return useCallback(
    (id: TaskSegmentId) => {
      haptics.selection();

      const targetPath = SEGMENT_PATHS[id];

      if (targetPath !== undefined && location.pathname !== targetPath) {
        void navigate(targetPath);
      }
    },
    [haptics, location.pathname, navigate],
  );
}
