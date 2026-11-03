export function shouldGoBack(historyState: unknown): boolean {
  if (typeof historyState !== "object" || historyState === null) {
    return false;
  }

  const idx = (historyState as { idx?: unknown }).idx;

  return typeof idx === "number" && Number.isInteger(idx) && idx > 0;
}
