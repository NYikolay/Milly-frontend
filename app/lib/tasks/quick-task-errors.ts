import { ApiError, ApiNetworkError } from "~/lib/api/errors";

const NETWORK_COPY =
  "Не удалось подключиться. Проверьте сеть и попробуйте ещё раз.";
const VALIDATION_COPY = "Проверьте заполнение формы и попробуйте ещё раз.";
export const QUICK_ADD_SELECTION_UNAVAILABLE_COPY =
  "Метки или проект больше недоступны. Обновите список.";
const RATE_LIMITED_COPY = "Слишком много запросов. Попробуйте позже.";
const SERVICE_UNAVAILABLE_COPY =
  "Сервис временно недоступен. Попробуйте ещё раз.";
const GENERIC_COPY = "Не удалось добавить задачу. Попробуйте ещё раз.";

export function describeQuickAddError(error: unknown): string {
  if (error instanceof ApiNetworkError) {
    return NETWORK_COPY;
  }

  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 422) {
      return VALIDATION_COPY;
    }

    if (error.status === 404) {
      return QUICK_ADD_SELECTION_UNAVAILABLE_COPY;
    }

    if (error.status === 429) {
      return RATE_LIMITED_COPY;
    }

    if (error.status >= 500) {
      return SERVICE_UNAVAILABLE_COPY;
    }
  }

  return GENERIC_COPY;
}
