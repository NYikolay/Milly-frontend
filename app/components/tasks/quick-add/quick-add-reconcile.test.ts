import { describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/errors";
import type { LabelResponse } from "~/lib/labels/types";
import type { ProjectResponse } from "~/lib/projects/types";

import { reconcileQuickAddSelection } from "./quick-add-reconcile";

const label: LabelResponse = {
  id: 3,
  name: "Работа",
  color: { id: 2, slug: "blue", name: "Синий", hex: "#2563EB" },
  created_at: "2026-11-06T09:00:00Z",
  updated_at: "2026-11-06T09:00:00Z",
};

function createProject(id: number, name: string): ProjectResponse {
  return {
    id,
    name,
    description: null,
    icon: "leaf",
    color: { id: 4, slug: "green", name: "Зелёный", hex: "#16A34A" },
    progress: { total: 0, completed: 0, remaining: 0 },
    archived_at: null,
    created_at: "2026-11-06T09:00:00Z",
    updated_at: "2026-11-06T09:00:00Z",
  };
}

function apiError(status: number): ApiError {
  return new ApiError("technical", {
    status,
    code: "bad_request",
    requestId: "request-1",
  });
}

function successful<T>(data: T) {
  return async () => ({ isSuccess: true as const, data });
}

function failed<T>() {
  return async () => ({ isSuccess: false as const, data: undefined as T | undefined });
}

describe("reconcileQuickAddSelection", () => {
  it("refetches labels and projects and prunes both on 404", async () => {
    const refetchLabels = vi.fn(successful([label]));
    const refetchProjects = vi.fn(successful([createProject(10, "Личное")]));
    const pruneLabelIds = vi.fn<(validIds: number[]) => void>();
    const pruneProjectId = vi.fn<(validIds: number[]) => void>();

    const result = await reconcileQuickAddSelection({
      error: apiError(404),
      selectedProjectId: 10,
      refetchLabels,
      refetchProjects,
      pruneLabelIds,
      pruneProjectId,
    });

    expect(result).toBe(true);
    expect(refetchLabels).toHaveBeenCalledTimes(1);
    expect(refetchProjects).toHaveBeenCalledTimes(1);
    expect(pruneLabelIds).toHaveBeenCalledWith([3]);
    expect(pruneProjectId).toHaveBeenCalledWith([10]);
  });

  it("still prunes projects on 404 when the labels refetch fails", async () => {
    const refetchLabels = vi.fn(failed<LabelResponse[]>());
    const refetchProjects = vi.fn(successful([createProject(10, "Личное")]));
    const pruneLabelIds = vi.fn<(validIds: number[]) => void>();
    const pruneProjectId = vi.fn<(validIds: number[]) => void>();

    const result = await reconcileQuickAddSelection({
      error: apiError(404),
      selectedProjectId: 10,
      refetchLabels,
      refetchProjects,
      pruneLabelIds,
      pruneProjectId,
    });

    expect(result).toBe(true);
    expect(pruneLabelIds).not.toHaveBeenCalled();
    expect(pruneProjectId).toHaveBeenCalledWith([10]);
  });

  it("refetches projects, prunes and shows selection unavailable when a 400 project is missing", async () => {
    const refetchLabels = vi.fn(successful([label]));
    const refetchProjects = vi.fn(successful([createProject(11, "Работа")]));
    const pruneLabelIds = vi.fn<(validIds: number[]) => void>();
    const pruneProjectId = vi.fn<(validIds: number[]) => void>();

    const result = await reconcileQuickAddSelection({
      error: apiError(400),
      selectedProjectId: 10,
      refetchLabels,
      refetchProjects,
      pruneLabelIds,
      pruneProjectId,
    });

    expect(result).toBe(true);
    expect(refetchLabels).not.toHaveBeenCalled();
    expect(refetchProjects).toHaveBeenCalledTimes(1);
    expect(pruneLabelIds).not.toHaveBeenCalled();
    expect(pruneProjectId).toHaveBeenCalledWith([11]);
  });

  it("keeps validation copy and does not prune when a 400 project is still present", async () => {
    const refetchLabels = vi.fn(successful([label]));
    const refetchProjects = vi.fn(successful([createProject(10, "Личное")]));
    const pruneLabelIds = vi.fn<(validIds: number[]) => void>();
    const pruneProjectId = vi.fn<(validIds: number[]) => void>();

    const result = await reconcileQuickAddSelection({
      error: apiError(400),
      selectedProjectId: 10,
      refetchLabels,
      refetchProjects,
      pruneLabelIds,
      pruneProjectId,
    });

    expect(result).toBe(false);
    expect(refetchLabels).not.toHaveBeenCalled();
    expect(refetchProjects).toHaveBeenCalledTimes(1);
    expect(pruneLabelIds).not.toHaveBeenCalled();
    expect(pruneProjectId).not.toHaveBeenCalled();
  });

  it("does not refetch for a 400 without a selected project", async () => {
    const refetchLabels = vi.fn(successful([label]));
    const refetchProjects = vi.fn(successful([createProject(10, "Личное")]));
    const pruneLabelIds = vi.fn<(validIds: number[]) => void>();
    const pruneProjectId = vi.fn<(validIds: number[]) => void>();

    const result = await reconcileQuickAddSelection({
      error: apiError(400),
      selectedProjectId: null,
      refetchLabels,
      refetchProjects,
      pruneLabelIds,
      pruneProjectId,
    });

    expect(result).toBe(false);
    expect(refetchLabels).not.toHaveBeenCalled();
    expect(refetchProjects).not.toHaveBeenCalled();
    expect(pruneLabelIds).not.toHaveBeenCalled();
    expect(pruneProjectId).not.toHaveBeenCalled();
  });

  it("does nothing for a non-ApiError", async () => {
    const refetchLabels = vi.fn(successful([label]));
    const refetchProjects = vi.fn(successful([createProject(10, "Личное")]));
    const pruneLabelIds = vi.fn<(validIds: number[]) => void>();
    const pruneProjectId = vi.fn<(validIds: number[]) => void>();

    const result = await reconcileQuickAddSelection({
      error: new Error("boom"),
      selectedProjectId: 10,
      refetchLabels,
      refetchProjects,
      pruneLabelIds,
      pruneProjectId,
    });

    expect(result).toBe(false);
    expect(refetchLabels).not.toHaveBeenCalled();
    expect(refetchProjects).not.toHaveBeenCalled();
    expect(pruneLabelIds).not.toHaveBeenCalled();
    expect(pruneProjectId).not.toHaveBeenCalled();
  });
});
