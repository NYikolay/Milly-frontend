import { apiRequest } from "~/lib/api/client";

import type { ProjectResponse } from "./types";

interface ProjectsListResponse {
  items: ProjectResponse[];
  next_cursor: string | null;
}

export async function fetchProjects(
  signal?: AbortSignal,
): Promise<ProjectResponse[]> {
  const response = await apiRequest<ProjectsListResponse>(
    "/projects?limit=100",
    { signal },
  );
  return response.items;
}
