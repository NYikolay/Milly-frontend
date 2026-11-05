import type { LabelResponse } from "./types";

export function pruneMissingLabelIds(
  selectedIds: number[],
  labels: Pick<LabelResponse, "id">[],
): number[] {
  const visibleIds = new Set(labels.map((label) => label.id));
  const seenIds = new Set<number>();
  const result: number[] = [];

  for (const id of selectedIds) {
    if (!visibleIds.has(id) || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);
    result.push(id);
  }

  return result;
}
