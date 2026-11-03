import type { AppErrorDescriptor } from "./app-error";

export interface AppErrorCopy {
  title: string;
  description: string[];
  primaryAction: "home" | "retry";
  primaryLabel: string;
  secondaryLabel: string;
  hint: string[];
}

const SERVER_DESCRIPTION = [
  "Не удалось выполнить запрос. Попробуйте ещё раз чуть позже.",
  "В случае повторения ошибки пожалуйста, обратитесь в службу поддержки.",
];

export function getAppErrorCopy(
  descriptor: AppErrorDescriptor,
): AppErrorCopy {
  switch (descriptor.kind) {
    case "not-found":
      return {
        title: "Страница не найдена",
        description: [
          "Возможно, ссылка устарела или страница была перемещена.",
        ],
        primaryAction: "home",
        primaryLabel: "На главную",
        secondaryLabel: "Назад",
        hint: [],
      };

    case "rate-limited":
      return {
        title: "Слишком много запросов",
        description: [
          "Вы отправили слишком много запросов подряд. Подождите немного и повторите попытку.",
        ],
        primaryAction: "retry",
        primaryLabel: "Повторить запрос",
        secondaryLabel: "Назад",
        hint: ["Сделайте небольшую паузу"],
      };

    case "server": {
      const hint: string[] = [];

      if (descriptor.status === null || descriptor.status >= 500) {
        hint.push("Ошибка на стороне сервера.");

        if (descriptor.requestId !== null && descriptor.requestId !== "") {
          hint.push(`Код ошибки: ${descriptor.requestId}`);
        }
      }

      return {
        title: "Что-то пошло не так",
        description: [...SERVER_DESCRIPTION],
        primaryAction: "retry",
        primaryLabel: "Попробовать снова",
        secondaryLabel: "Назад",
        hint,
      };
    }
  }
}
