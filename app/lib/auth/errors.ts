import type { AuthFailure } from "./types";

export class EmptyInitDataError extends Error {
  constructor() {
    super("Telegram init data is empty");
    this.name = "EmptyInitDataError";
  }
}

export class AuthSessionError extends Error {
  failure: AuthFailure;

  constructor(failure: AuthFailure) {
    super("Authentication session is not valid");
    this.name = "AuthSessionError";
    this.failure = failure;
  }
}
