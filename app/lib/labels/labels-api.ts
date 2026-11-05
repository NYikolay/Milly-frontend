import { apiRequest } from "~/lib/api/client";

import type { LabelResponse } from "./types";

interface LabelsListResponse {
  items: LabelResponse[];
}

export async function fetchLabels(
  signal?: AbortSignal,
): Promise<LabelResponse[]> {
  const response = await apiRequest<LabelsListResponse>("/labels", { signal });

  return response.items;
}
