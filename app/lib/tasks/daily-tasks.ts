export interface DailyTasksSummary {
  total: number;
  completed: number;
}

export async function getDailyTasksSummary(): Promise<DailyTasksSummary> {
  return { total: 6, completed: 2 };
}
