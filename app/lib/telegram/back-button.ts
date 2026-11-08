import { supportsVersion } from "./client";
import type { TelegramWebApp } from "./types";

export function bindTelegramBackButton(
  webApp: TelegramWebApp | null,
  onBack: () => void,
): () => void {
  const backButton = webApp?.BackButton;

  if (!webApp || !backButton || !supportsVersion("6.1", webApp)) {
    return () => {};
  }

  backButton.onClick(onBack);
  backButton.show();

  return () => {
    backButton.offClick(onBack);
    backButton.hide();
  };
}
