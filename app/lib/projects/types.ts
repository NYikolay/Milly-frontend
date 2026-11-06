import type { ColorResponse } from "~/lib/labels/types";

export interface ProjectProgress {
  total: number;
  completed: number;
  remaining: number;
}

export interface ProjectResponse {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: ColorResponse;
  progress: ProjectProgress;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}
