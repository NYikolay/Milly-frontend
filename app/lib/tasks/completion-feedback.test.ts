import { describe, expect, it } from "vitest";

import {
  TASK_COMPLETION_ERROR,
  getCompletionError,
  getPendingTaskId,
} from "./completion-feedback";

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
});
