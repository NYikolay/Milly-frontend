import { ApiError } from "~/lib/api/errors";
import type { LabelResponse } from "~/lib/labels/types";
import type { ProjectResponse } from "~/lib/projects/types";

export interface QuickAddSelectionRefetchResult<T> {
  isSuccess: boolean;
  data: T | undefined;
}

export interface ReconcileQuickAddSelectionOptions {
  error: unknown;
  selectedProjectId: number | null;
  refetchLabels: () => Promise<QuickAddSelectionRefetchResult<LabelResponse[]>>;
  refetchProjects: () => Promise<
    QuickAddSelectionRefetchResult<ProjectResponse[]>
  >;
  pruneLabelIds: (validIds: number[]) => void;
  pruneProjectId: (validIds: number[]) => void;
}

export async function reconcileQuickAddSelection({
  error,
  selectedProjectId,
  refetchLabels,
  refetchProjects,
  pruneLabelIds,
  pruneProjectId,
}: ReconcileQuickAddSelectionOptions): Promise<boolean> {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.status === 404) {
    const [labelsResult, projectsResult] = await Promise.all([
      refetchLabels(),
      refetchProjects(),
    ]);

    if (labelsResult.isSuccess) {
      pruneLabelIds((labelsResult.data ?? []).map((label) => label.id));
    }

    if (projectsResult.isSuccess) {
      pruneProjectId(
        (projectsResult.data ?? []).map((project) => project.id),
      );
    }

    return true;
  }

  if (error.status === 400 && selectedProjectId !== null) {
    const projectsResult = await refetchProjects();

    if (!projectsResult.isSuccess) {
      return false;
    }

    const projects = projectsResult.data ?? [];

    if (projects.some((project) => project.id === selectedProjectId)) {
      return false;
    }

    pruneProjectId(projects.map((project) => project.id));

    return true;
  }

  return false;
}
