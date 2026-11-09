export type Priority =
  | "urgent_important"
  | "important_not_urgent"
  | "urgent_not_important"
  | "neither";

export type TaskRecurrence = "one_off" | "regular" | "periodic";

export type SeriesFrequency = "daily" | "periodic";

export interface LabelRef {
  id: number;
  name: string;
}

export type ReminderKind = "before_due" | "scheduled";

export interface ReminderInput {
  kind: ReminderKind;
  enabled?: boolean;
  offset_minutes?: number | null;
  interval_days?: number | null;
  time_of_day?: string | null;
}

export interface TaskCreateInput {
  title: string;
  description?: string | null;
  priority?: Priority;
  due_at: string;
  project_id?: number | null;
  label_ids?: number[];
  reminders_enabled?: boolean;
  reminders?: ReminderInput[];
}

export interface TaskUpdateInput {
  priority?: Priority;
  due_at?: string;
  recurrence?: TaskRecurrence;
  reminders_enabled?: boolean;
  reminders?: ReminderInput[];
  project_id?: number | null;
}

export interface SeriesCreateInput {
  title: string;
  description?: string | null;
  priority?: Priority;
  frequency?: SeriesFrequency;
  interval_days?: number | null;
  time_of_day: string;
  timezone: string;
  starts_on: string;
  ends_on?: string | null;
  project_id?: number | null;
  label_ids?: number[];
  reminders_enabled?: boolean;
  reminders?: ReminderInput[];
}

export interface ReminderResponse {
  id: number;
  kind: ReminderKind;
  enabled: boolean;
  offset_minutes: number | null;
  interval_days: number | null;
  time_of_day: string | null;
  timezone: string | null;
  next_run_at: string | null;
}

export interface TaskResponse {
  id: number;
  series_id: number | null;
  project_id: number | null;
  title: string;
  description: string | null;
  priority: Priority;
  recurrence: TaskRecurrence;
  due_at: string;
  completed_at: string | null;
  reminders_enabled: boolean;
  labels: LabelRef[];
  reminders: ReminderResponse[];
  created_at: string;
  updated_at: string;
}

export type TaskListStatus = "all" | "open" | "completed" | "overdue";

export interface TaskListQuery {
  date?: string;
  project_ids?: number[];
  priorities?: Priority[];
  status?: TaskListStatus;
  recurrence?: TaskRecurrence | "all";
  limit?: number;
  cursor?: string;
  q?: string;
}

export interface TaskListResponse {
  items: TaskResponse[];
  next_cursor: string | null;
}

export interface TodayProgressResponse {
  total: number;
  completed: number;
  remaining: number;
}

export interface SeriesResponse {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  frequency: SeriesFrequency;
  interval_days: number;
  time_of_day: string;
  timezone: string;
  starts_on: string;
  ends_on: string | null;
  generated_through: string | null;
  reminders_enabled: boolean;
  labels: LabelRef[];
  reminders: ReminderResponse[];
  created_at: string;
  updated_at: string;
}
