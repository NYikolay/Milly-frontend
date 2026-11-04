export const AUTH_BOOTSTRAP_BUDGET_MS = 10000;

export const AUTH_TELEGRAM_INIT_TIMEOUT_MS = 4000;

export function remainingBudgetMs(
  deadline: number,
  now: number = Date.now(),
): number {
  return Math.max(0, deadline - now);
}

export interface BootstrapRequestOptions {
  signal: AbortSignal;
  timeoutMs: number;
}
