import type { TaskResponse } from "./types";

export type TodayTasksState = "default" | "empty" | "completed";

export const PLANNED_PREVIEW_LIMIT = 4;
export const COMPLETED_PREVIEW_LIMIT = 4;

export function getTodayTasksState(
  total: number,
  completed: number,
): TodayTasksState {
  if (total <= 0) return "empty";
  if (completed >= total) return "completed";
  return "default";
}

export function splitTodayTasks(tasks: TaskResponse[]) {
  const planned: TaskResponse[] = [];
  const completed: TaskResponse[] = [];

  for (const task of tasks) {
    (task.completed_at === null ? planned : completed).push(task);
  }

  return { planned, completed };
}

export function getTodayProgressCopy(total: number, completed: number) {
  const normalizedTotal = Math.max(total, 0);
  const normalizedCompleted =
    normalizedTotal === 0
      ? 0
      : Math.min(Math.max(completed, 0), normalizedTotal);

  if (normalizedTotal > 0 && normalizedCompleted >= normalizedTotal) {
    return {
      title: "На сегодня всё 🥳",
      description: `${normalizedCompleted} из ${normalizedTotal} задач выполнено ✌`,
    };
  }

  return {
    title: "Всё идёт по плану",
    description: `${normalizedCompleted} из ${normalizedTotal} задач выполнено`,
  };
}

export function getVisibleTasks(
  tasks: TaskResponse[],
  limit: number,
  expanded: boolean,
): TaskResponse[] {
  return expanded ? tasks : tasks.slice(0, limit);
}
