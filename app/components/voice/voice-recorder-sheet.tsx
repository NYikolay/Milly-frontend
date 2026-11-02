import { useEffect, useId, useState } from "react";
import type { ReactElement } from "react";

import { BottomSheet, BottomSheetAction } from "~/components/ui/bottom-sheet";
import { VoiceRecordButton } from "~/components/voice/voice-record-button";
import { useVoiceRecorder } from "~/hooks/use-voice-recorder";
import { cn } from "~/lib/cn";
import type {
  VoiceRecorderError,
  VoiceRecorderStatus,
} from "~/lib/voice/types";
import { useTelegram } from "~/providers/telegram-provider";

export interface VoiceRecorderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type InstructionTone = "secondary" | "accent" | "destructive";

interface InstructionCopy {
  title: string;
  subtitle: string;
  tone: InstructionTone;
}

const ERROR_COPY: Record<
  VoiceRecorderError,
  { title: string; subtitle: string }
> = {
  "permission-denied": {
    title: "Нет доступа к микрофону",
    subtitle: "Разрешите доступ в настройках и попробуйте снова",
  },
  unsupported: {
    title: "Запись недоступна",
    subtitle: "Это устройство не поддерживает запись звука",
  },
  "no-microphone": {
    title: "Микрофон не найден",
    subtitle: "Подключите микрофон и попробуйте снова",
  },
  recorder: {
    title: "Не удалось записать",
    subtitle: "Попробуйте ещё раз",
  },
  upload: {
    title: "Не удалось отправить",
    subtitle: "Попробуйте ещё раз",
  },
};

const TONE_CLASSES: Record<InstructionTone, string> = {
  secondary: "text-app-text-secondary",
  accent: "text-app-accent",
  destructive: "text-app-destructive",
};

function getInstruction(
  status: VoiceRecorderStatus,
  cancelArmed: boolean,
  error: VoiceRecorderError | null,
): InstructionCopy {
  switch (status) {
    case "idle":
    case "preparing":
      return {
        title: "Зажмите, чтобы записать",
        subtitle: "Отпустите, чтобы отправить",
        tone: "secondary",
      };
    case "recording":
      return cancelArmed
        ? {
            title: "Запись будет отменена",
            subtitle: "Отпустите для отмены",
            tone: "destructive",
          }
        : {
            title: "Идёт запись...",
            subtitle: "Проведите вниз для отмены",
            tone: "accent",
          };
    case "sending":
      return {
        title: "Отправляем...",
        subtitle: "сообщение уже в пути",
        tone: "secondary",
      };
    case "error":
      return {
        ...ERROR_COPY[error ?? "recorder"],
        tone: "destructive",
      };
  }
}

export function VoiceRecorderSheet({
  open,
  onOpenChange,
}: VoiceRecorderSheetProps): ReactElement {
  const { haptics, isActive } = useTelegram();
  const [cancelArmed, setCancelArmed] = useState(false);

  const handleSendSuccess = (): void => {
    haptics.notification("success");
    onOpenChange(false);
  };

  const { status, error, prepare, start, stopAndSend, cancel, reset } =
    useVoiceRecorder({ onSendSuccess: handleSendSuccess });

  useEffect(() => {
    setCancelArmed(false);

    if (open) {
      void prepare();
      return;
    }

    reset();
  }, [open, prepare, reset]);

  useEffect(() => {
    if (status === "error") {
      haptics.notification("error");
    }
  }, [status, haptics]);

  useEffect(() => {
    if (!isActive && status === "recording") {
      cancel();
    }
  }, [isActive, status, cancel]);

  const handleDismiss = (): void => {
    haptics.selection();
    reset();
    onOpenChange(false);
  };

  const handlePressStart = (): void => {
    if (!open) {
      return;
    }

    if (status === "error") {
      void prepare();
      return;
    }

    if (status === "idle") {
      haptics.impact("medium");
      void start();
    }
  };

  const handlePressEnd = (cancelled: boolean): void => {
    setCancelArmed(false);

    if (!open) {
      return;
    }

    if (cancelled) {
      if (status === "recording" || status === "idle") {
        cancel();
        haptics.notification("warning");
      }

      return;
    }

    void stopAndSend();
  };

  const handleCancelArmedChange = (armed: boolean): void => {
    setCancelArmed(armed);

    if (armed) {
      haptics.impact("rigid");
      return;
    }

    haptics.selection();
  };

  const descriptionId = useId();
  const instructionId = useId();
  const instruction = getInstruction(status, cancelArmed, error);

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleDismiss}
      title="Голосовое сообщение"
      describedBy={descriptionId}
      footer={
        <BottomSheetAction onClick={handleDismiss}>Закрыть</BottomSheetAction>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-5 px-6 py-[15px]">
        <p
          id={descriptionId}
          className="text-center text-[15px] leading-[1.3] text-app-text-secondary"
        >
          Расскажите какую задачу или трату необходимо записать
        </p>
        <VoiceRecordButton
          status={status}
          cancelArmed={cancelArmed}
          disabled={!open || status === "preparing" || status === "sending"}
          describedBy={instructionId}
          onCancelArmedChange={handleCancelArmedChange}
          onPressStart={handlePressStart}
          onPressEnd={handlePressEnd}
        />
        <div
          id={instructionId}
          aria-live="polite"
          className="flex flex-col items-center gap-[5px] text-center"
        >
          <p className="text-[15px] font-semibold leading-[18px] text-app-text">
            {instruction.title}
          </p>
          <p
            className={cn(
              "text-[13px] leading-[1.4]",
              TONE_CLASSES[instruction.tone],
            )}
          >
            {instruction.subtitle}
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
