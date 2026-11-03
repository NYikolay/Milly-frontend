import { data, isRouteErrorResponse } from "react-router";

import { classifyAppError } from "./app-error";
import type { AppErrorPayload } from "./app-error";

export function throwAppError(error: unknown): never {
  if (isRouteErrorResponse(error)) {
    throw error;
  }

  const descriptor = classifyAppError(error);

  throw data(
    { appError: descriptor } satisfies AppErrorPayload,
    { status: descriptor.status ?? 500 },
  );
}
