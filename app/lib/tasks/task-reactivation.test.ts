import { describe, expect, it } from "vitest";

import { ApiError } from "~/lib/api/errors";

import {
  TASK_PAST_DUE_MESSAGE,
  isDueTimeInPast,
  isPastDueUncompleteError,
  shouldBlockTaskReactivation,
} from "./task-reactivation";
import type { TaskResponse } from "./types";

const NOW = new Date("2026-11-06T10:00:00.000Z");

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    series_id: null,
    project_id: null,
    title: "Задача",
    description: null,
    priority: "neither",
    recurrence: "one_off",
    due_at: "2026-11-06T08:00:00.000Z",
    completed_at: null,
    reminders_enabled: false,
    labels: [],
    reminders: [],
    created_at: "2026-11-05T07:00:00.000Z",
    updated_at: "2026-11-05T07:00:00.000Z",
    ...overrides,
  };
}

function apiError(
  overrides: {
    message?: string;
    description?: string;
    status?: number;
  } = {},
): ApiError {
  return new ApiError(overrides.message ?? "Bad request", {
    status: overrides.status ?? 400,
    code: "bad_request",
    requestId: "request-1",
    description: overrides.description,
  });
}

describe("isDueTimeInPast", () => {
  it("returns true for a due moment yesterday", () => {
    expect(
      isDueTimeInPast(task({ due_at: "2026-11-05T08:00:00.000Z" }), NOW),
    ).toBe(true);
  });

  it("returns true for an earlier moment today", () => {
    expect(
      isDueTimeInPast(task({ due_at: "2026-11-06T09:00:00.000Z" }), NOW),
    ).toBe(true);
  });

  it("returns false for a later moment today", () => {
    expect(
      isDueTimeInPast(task({ due_at: "2026-11-06T11:00:00.000Z" }), NOW),
    ).toBe(false);
  });

  it("returns false for a due moment tomorrow", () => {
    expect(
      isDueTimeInPast(task({ due_at: "2026-11-07T08:00:00.000Z" }), NOW),
    ).toBe(false);
  });

  it("returns true for a due moment exactly at now", () => {
    expect(
      isDueTimeInPast(task({ due_at: "2026-11-06T10:00:00.000Z" }), NOW),
    ).toBe(true);
  });
});

describe("shouldBlockTaskReactivation", () => {
  it("blocks a completed one-off task due yesterday", () => {
    expect(
      shouldBlockTaskReactivation(
        task({
          due_at: "2026-11-05T08:00:00.000Z",
          completed_at: "2026-11-05T09:00:00.000Z",
        }),
        false,
        NOW,
      ),
    ).toBe(true);
  });

  it("blocks a completed one-off task due earlier today", () => {
    expect(
      shouldBlockTaskReactivation(
        task({
          due_at: "2026-11-06T09:00:00.000Z",
          completed_at: "2026-11-06T08:00:00.000Z",
        }),
        false,
        NOW,
      ),
    ).toBe(true);
  });

  it("allows a completed one-off task due later today", () => {
    expect(
      shouldBlockTaskReactivation(
        task({
          due_at: "2026-11-06T11:00:00.000Z",
          completed_at: "2026-11-06T08:00:00.000Z",
        }),
        false,
        NOW,
      ),
    ).toBe(false);
  });

  it("blocks a completed series task due yesterday", () => {
    expect(
      shouldBlockTaskReactivation(
        task({
          series_id: 42,
          due_at: "2026-11-05T08:00:00.000Z",
          completed_at: "2026-11-05T09:00:00.000Z",
        }),
        false,
        NOW,
      ),
    ).toBe(true);
  });

  it("allows an active task due on a previous day", () => {
    expect(
      shouldBlockTaskReactivation(
        task({
          due_at: "2026-11-05T08:00:00.000Z",
          completed_at: null,
        }),
        false,
        NOW,
      ),
    ).toBe(false);
  });

  it("allows a completion change", () => {
    expect(
      shouldBlockTaskReactivation(
        task({
          due_at: "2026-11-05T08:00:00.000Z",
          completed_at: "2026-11-05T09:00:00.000Z",
        }),
        true,
        NOW,
      ),
    ).toBe(false);
  });
});

describe("isPastDueUncompleteError", () => {
  it("recognizes a past-due error by message", () => {
    expect(
      isPastDueUncompleteError(
        apiError({ message: "Task due date is in the past" }),
      ),
    ).toBe(true);
  });

  it("recognizes a past-due error by description", () => {
    expect(
      isPastDueUncompleteError(
        apiError({ description: TASK_PAST_DUE_MESSAGE }),
      ),
    ).toBe(true);
  });

  it("ignores other 400 errors", () => {
    expect(isPastDueUncompleteError(apiError())).toBe(false);
  });

  it("ignores a past-due message with a non-400 status", () => {
    expect(
      isPastDueUncompleteError(
        apiError({ message: "Task due date is in the past", status: 422 }),
      ),
    ).toBe(false);
  });

  it("ignores plain errors", () => {
    expect(
      isPastDueUncompleteError(new Error("Task due date is in the past")),
    ).toBe(false);
  });
});
