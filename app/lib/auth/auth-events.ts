import type { AuthFailure } from "./types";

type AuthFailureListener = (failure: AuthFailure) => void;

let listener: AuthFailureListener | null = null;
let notificationSent = false;

export function setAuthFailureListener(
  nextListener: AuthFailureListener | null,
): void {
  listener = nextListener;
}

export function resetAuthFailureNotification(): void {
  notificationSent = false;
}

export function notifyAuthFailure(failure: AuthFailure): void {
  if (notificationSent) {
    return;
  }

  notificationSent = true;
  listener?.(failure);
}
