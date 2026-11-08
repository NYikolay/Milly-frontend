import { queryOptions } from "@tanstack/react-query";

import { fetchProjects } from "./projects-api";

export const PROJECTS_QUERY_KEY = ["projects"] as const;

export const projectsQueryOptions = queryOptions({
  queryKey: PROJECTS_QUERY_KEY,
  queryFn: ({ signal }) => fetchProjects(signal),
});
