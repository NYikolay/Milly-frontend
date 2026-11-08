import { queryOptions } from "@tanstack/react-query";

import { fetchLabels } from "./labels-api";

export const LABELS_QUERY_KEY = ["labels"] as const;

export const labelsQueryOptions = queryOptions({
  queryKey: LABELS_QUERY_KEY,
  queryFn: ({ signal }) => fetchLabels(signal),
});
