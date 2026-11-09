import { describe, expect, it } from "vitest";

import { ApiError } from "~/lib/api/errors";

import {
  TASK_COMPLETION_ERROR,
  getCompletionError,
  getPendingTaskId,
} from "./completion-feedback";
import { TASK_PAST_DUE_MESSAGE } from "./task-reactivation";

describe("getPendingTaskId", () => {
  it("returns the task id only while pending", () => {
    expect(
      getPendingTaskId({
        isPending: true,
        isError: false,
        variables: { taskId: 7 },
      }),
    ).toBe(7);
    expect(
      getPendingTaskId({
        isPending: false,
        isError: false,
        variables: { taskId: 7 },
      }),
    ).toBeNull();
    expect(
      getPendingTaskId({ isPending: true, isError: false }),
    ).toBeNull();
  });
});

describe("getCompletionError", () => {
  it("returns the shared copy only on error", () => {
    expect(getCompletionError({ isError: true })).toBe(TASK_COMPLETION_ERROR);
    expect(getCompletionError({ isError: false })).toBeNull();
  });

  it("suppresses the shared copy for a past-due reactivation error", () => {
    expect(
      getCompletionError({
        isError: true,
        error: new ApiError("Task due date is in the past", {
          status: 400,
          code: "bad_request",
          requestId: "request-1",
          description: TASK_PAST_DUE_MESSAGE,
        }),
      }),
    ).toBeNull();
  });

  it("returns the shared copy for other errors", () => {
    expect(
      getCompletionError({
        isError: true,
        error: new Error("request failed"),
      }),
    ).toBe(TASK_COMPLETION_ERROR);
  });
});
