import { describe, expect, it } from "vitest";

import { createQuickTaskDefaults } from "~/lib/tasks/quick-task-schema";

import { createQuickAddStore } from "./quick-add-store";

const BASE_NOW = new Date("2026-11-05T13:07:42Z");
const now = new Date(BASE_NOW);
let currentNow = new Date(BASE_NOW);
const clock = () => currentNow;

function createStore() {
  currentNow = new Date(BASE_NOW);
  return createQuickAddStore({ now, timeZone: "Europe/Moscow", clock });
}

describe("quick add store", () => {
  it("initializes defaults and keeps instances isolated", () => {
    const first = createStore();
    const second = createStore();

    first.getState().patchDraft({ title: "Draft" });

    expect(first.getState().draft.title).toBe("Draft");
    expect(second.getState().draft).toEqual(
      createQuickTaskDefaults(now, "Europe/Moscow"),
    );
    expect(first.getState().activeStep).toBeNull();
    expect(first.getState().stepDraft).toBeNull();
    expect(first.getState().remindersAmountInput).toBe("");
    expect(first.getState().error).toBeNull();
  });

  it("drops step edits on close and commits them on apply", () => {
    const store = createStore();

    store.getState().patchDraft({ title: "Draft", labelIds: [1] });
    store.getState().openStep("labels");
    store.getState().patchStepDraft({ title: "Changed", labelIds: [2] });

    expect(store.getState().draft.title).toBe("Draft");
    expect(store.getState().draft.labelIds).toEqual([1]);
    expect(store.getState().stepDraft?.title).toBe("Changed");

    store.getState().closeStep();
    expect(store.getState().draft.title).toBe("Draft");
    expect(store.getState().activeStep).toBeNull();
    expect(store.getState().stepDraft).toBeNull();

    store.getState().openStep("labels");
    store.getState().patchStepDraft({ labelIds: [3] });
    store.getState().applyStep({ labelIds: [4] });

    expect(store.getState().draft.labelIds).toEqual([4]);
    expect(store.getState().activeStep).toBeNull();
    expect(store.getState().stepDraft).toBeNull();
  });

  it("clamps the due date and refreshes now when the due step opens", () => {
    const store = createStore();

    store.getState().patchDraft({ dueDate: "2026-11-04" });

    const advancedNow = new Date("2026-11-06T10:00:00Z");
    currentNow = advancedNow;

    store.getState().openStep("due");

    expect(store.getState().now).toEqual(advancedNow);
    expect(store.getState().stepDraft?.dueDate).toBe("2026-11-06");
  });

  it("initializes and clears the reminders amount input", () => {
    const store = createStore();

    store.getState().patchDraft({ beforeDueAmount: 5 });
    store.getState().openStep("reminders");
    expect(store.getState().remindersAmountInput).toBe("5");

    store.getState().setRemindersAmountInput("");
    expect(store.getState().remindersAmountInput).toBe("");

    store.getState().closeStep();
    expect(store.getState().remindersAmountInput).toBe("");
  });

  it("resets the draft, now, step and error", () => {
    const store = createStore();

    store.getState().patchDraft({ title: "Draft" });
    store.getState().setError("boom");
    store.getState().openStep("reminders");
    store.getState().setRemindersAmountInput("5");
    expect(store.getState().remindersAmountInput).toBe("5");
    store.getState().resetDraft();

    expect(store.getState().draft).toEqual(
      createQuickTaskDefaults(clock(), "Europe/Moscow"),
    );
    expect(store.getState().now).toEqual(clock());
    expect(store.getState().activeStep).toBeNull();
    expect(store.getState().stepDraft).toBeNull();
    expect(store.getState().remindersAmountInput).toBe("");
    expect(store.getState().error).toBeNull();
  });

  it("prunes label ids in both drafts", () => {
    const store = createStore();

    store.getState().patchDraft({ labelIds: [1, 2, 3] });
    store.getState().openStep("labels");
    store.getState().patchStepDraft({ labelIds: [2, 3, 4] });
    store.getState().pruneLabelIds([2, 3]);

    expect(store.getState().draft.labelIds).toEqual([2, 3]);
    expect(store.getState().stepDraft?.labelIds).toEqual([2, 3]);
  });

  it("commits and discards the project step like other steps", () => {
    const store = createStore();
    store.getState().patchDraft({ projectId: 10 });
    store.getState().openStep("project");
    store.getState().patchStepDraft({ projectId: 11 });
    expect(store.getState().draft.projectId).toBe(10);

    store.getState().closeStep();
    expect(store.getState().draft.projectId).toBe(10);

    store.getState().openStep("project");
    store.getState().applyStep({ projectId: 12 });
    expect(store.getState().draft.projectId).toBe(12);
  });

  it("prunes a missing project from both drafts", () => {
    const store = createStore();
    store.getState().patchDraft({ projectId: 10 });
    store.getState().openStep("project");
    store.getState().patchStepDraft({ projectId: 11 });

    store.getState().pruneProjectId([11]);
    expect(store.getState().draft.projectId).toBeNull();
    expect(store.getState().stepDraft?.projectId).toBe(11);
  });
});
