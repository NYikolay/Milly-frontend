import { MOCK_UPLOAD_DELAY_MS } from "./types";
import type { VoiceRecording } from "./types";

export interface UploadVoiceTaskOptions {
  signal?: AbortSignal;
  delayMs?: number;
}

export function uploadVoiceTask(
  recording: VoiceRecording,
  options: UploadVoiceTaskOptions = {},
): Promise<void> {
  const { signal, delayMs = MOCK_UPLOAD_DELAY_MS } = options;

  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload aborted", "AbortError"));
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const handleAbort = (): void => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }

      signal?.removeEventListener("abort", handleAbort);
      reject(new DOMException("Upload aborted", "AbortError"));
    };

    timer = setTimeout(() => {
      timer = undefined;
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}
