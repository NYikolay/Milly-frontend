import { useState } from "react";
import type { ReactElement } from "react";

import { Calendar } from "~/components/tasks/quick-add/calendar";
import { BottomSheetPrimaryAction } from "~/components/ui/bottom-sheet";
import { formatNumericDate } from "~/lib/tasks/date-time";

export interface DateFilterStepProps {
  today: string;
  initialDate: string;
  onApply: (date: string) => void;
}

export function DateFilterStep({
  today,
  initialDate,
  onApply,
}: DateFilterStepProps): ReactElement {
  const [selectedDate, setSelectedDate] = useState(initialDate);

  return (
    <div className="flex flex-1 flex-col">
      <Calendar
        value={selectedDate}
        today={today}
        onSelect={setSelectedDate}
      />
      <p className="mt-[15px] text-[13px] leading-[1.4] text-app-text-secondary">
        Показать все задачи на {formatNumericDate(selectedDate)}
      </p>
      <div className="mt-auto pt-[15px]">
        <BottomSheetPrimaryAction onClick={() => onApply(selectedDate)}>
          Готово
        </BottomSheetPrimaryAction>
      </div>
    </div>
  );
}
