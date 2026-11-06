import type { ReactElement } from "react";

import { MicIcon } from "~/components/voice/mic-icon";

export interface CreateTaskSectionProps {
  showSearchCard: boolean;
  onVoice: () => void;
  onInteractive: () => void;
  onSearch: () => void;
}

const cardClassName =
  "flex min-h-[165px] flex-col items-center gap-[10px] rounded-[25px] bg-app-card p-[15px] text-center active:opacity-70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent";

export function CreateTaskSection({
  showSearchCard,
  onVoice,
  onInteractive,
  onSearch,
}: CreateTaskSectionProps): ReactElement {
  return (
    <section
      aria-labelledby="create-task-title"
      className="flex flex-col gap-2 pt-4"
    >
      <h2
        className="px-[15px] text-[15px] font-semibold leading-[18px] text-app-text-secondary"
        id="create-task-title"
      >
        Создать задачу
      </h2>
      <div className="grid grid-cols-2 gap-[10px]">
        <button className={cardClassName} onClick={onVoice} type="button">
          <span className="flex size-[50px] items-center justify-center rounded-full bg-app-accent-soft">
            <span className="flex size-[40px] items-center justify-center rounded-full bg-app-accent shadow-[0_8px_20px] shadow-app-accent/15">
              <MicIcon className="size-[25px] text-white" />
            </span>
          </span>
          <span className="flex flex-col gap-[5px]">
            <span className="text-[15px] font-semibold leading-[18px] text-app-text">
              Голосом
            </span>
            <span className="text-[12px] leading-[1.4] text-app-text-secondary">
              Опишите словами задачу, мы добавим её в ваш список дел
            </span>
          </span>
        </button>
        <button className={cardClassName} onClick={onInteractive} type="button">
          <span aria-hidden="true" className="text-[40px] leading-none">
            📝
          </span>
          <span className="flex flex-col gap-[5px]">
            <span className="text-[15px] font-semibold leading-[18px] text-app-text">
              Интерактивно
            </span>
            <span className="text-[12px] leading-[1.4] text-app-text-secondary">
              Заполните форму для добавления задачи
            </span>
          </span>
        </button>
        {showSearchCard ? (
          <button className={cardClassName} onClick={onSearch} type="button">
            <span aria-hidden="true" className="text-[40px] leading-none">
              🔍
            </span>
            <span className="flex flex-col gap-[5px]">
              <span className="text-[15px] font-semibold leading-[18px] text-app-text">
                Поиск задач
              </span>
              <span className="text-[12px] leading-[1.4] text-app-text-secondary">
                Ищите, фильтруйте и сортируйте ваши задачи
              </span>
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
