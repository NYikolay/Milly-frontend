import { useEffect, useRef } from "react";

import { bindTelegramBackButton } from "~/lib/telegram/back-button";
import { useTelegram } from "~/providers/telegram-provider";

export function useTelegramBackButton(onBack: () => void): void {
  const { webApp } = useTelegram();
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    return bindTelegramBackButton(webApp, () => onBackRef.current());
  }, [webApp]);
}
