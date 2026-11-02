import { isVoiceRecordingSupported } from "./microphone";
import type {
  MicrophoneErrorReason,
  VoiceRecording,
  VoiceRecordingSession,
  VoiceRecordingStartResult,
} from "./types";

const MIME_TYPE_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

const DEFAULT_MIME_TYPE = "audio/webm";
const CANCELLED_MESSAGE = "Recording cancelled";
const RECORDER_ERROR_MESSAGE = "MediaRecorder error";

function pickSupportedMimeType(): string | undefined {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return undefined;
  }

  for (const mimeType of MIME_TYPE_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return undefined;
}

function getErrorName(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return null;
  }

  const { name } = error as { name?: unknown };
  return typeof name === "string" ? name : null;
}

function mapMicrophoneError(error: unknown): MicrophoneErrorReason {
  switch (getErrorName(error)) {
    case "NotAllowedError":
    case "SecurityError":
      return "permission-denied";
    case "NotFoundError":
    case "OverconstrainedError":
      return "no-microphone";
    case "NotSupportedError":
      return "unsupported";
    default:
      return "recorder";
  }
}

function stopStreamTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function toRecorderError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(RECORDER_ERROR_MESSAGE);
}

function createRecordingSession(
  recorder: MediaRecorder,
  stream: MediaStream,
  preferredMimeType: string | undefined,
): VoiceRecordingSession {
  const chunks: Blob[] = [];
  const startedAt = Date.now();
  let stoppedAt: number | null = null;
  let cancelled = false;
  let stopEventFired = false;
  let hasRecorderError = false;
  let recorderError: Error | null = null;
  let recording: VoiceRecording | null = null;
  let stopPromise: Promise<VoiceRecording> | null = null;
  let resolveStop: ((value: VoiceRecording) => void) | null = null;
  let rejectStop: ((reason?: unknown) => void) | null = null;

  const detachListeners = (): void => {
    recorder.ondataavailable = null;
    recorder.onstop = null;
    recorder.onerror = null;
  };

  const buildRecording = (): VoiceRecording => {
    const mimeType =
      recorder.mimeType || preferredMimeType || DEFAULT_MIME_TYPE;
    const endedAt = stoppedAt ?? Date.now();

    return {
      blob: new Blob(chunks, { type: mimeType }),
      mimeType,
      durationMs: Math.max(0, endedAt - startedAt),
    };
  };

  const stopRecorderQuietly = (): void => {
    if (recorder.state === "inactive") {
      return;
    }

    try {
      recorder.stop();
    } catch {
      return;
    }
  };

  const resolvePendingStop = (value: VoiceRecording): void => {
    const resolve = resolveStop;
    resolveStop = null;
    rejectStop = null;
    resolve?.(value);
  };

  const rejectPendingStop = (error: Error): void => {
    const reject = rejectStop;
    resolveStop = null;
    rejectStop = null;
    reject?.(error);
  };

  const handleStop = (): void => {
    if (stopEventFired) {
      return;
    }

    stopEventFired = true;
    stoppedAt ??= Date.now();
    recording = buildRecording();
    stopStreamTracks(stream);
    detachListeners();
    resolvePendingStop(recording);
  };

  const handleFailure = (error: unknown): void => {
    if (hasRecorderError || cancelled) {
      return;
    }

    hasRecorderError = true;
    recorderError = toRecorderError(error);
    stopStreamTracks(stream);
    detachListeners();
    stopRecorderQuietly();
    rejectPendingStop(recorderError);
  };

  recorder.ondataavailable = (event: BlobEvent): void => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onstop = handleStop;

  recorder.onerror = (event: ErrorEvent): void => {
    handleFailure(event.error);
  };

  const stop = (): Promise<VoiceRecording> => {
    if (stopPromise) {
      return stopPromise;
    }

    if (cancelled) {
      stopPromise = Promise.reject(new Error(CANCELLED_MESSAGE));
      return stopPromise;
    }

    if (hasRecorderError) {
      stopPromise = Promise.reject(
        recorderError ?? new Error(RECORDER_ERROR_MESSAGE),
      );
      return stopPromise;
    }

    if (recording) {
      stopPromise = Promise.resolve(recording);
      return stopPromise;
    }

    stopPromise = new Promise<VoiceRecording>((resolve, reject) => {
      resolveStop = resolve;
      rejectStop = reject;
    });

    stoppedAt = Date.now();

    try {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    } catch (error) {
      handleFailure(error);
    }

    return stopPromise;
  };

  const cancel = (): void => {
    if (cancelled) {
      return;
    }

    cancelled = true;
    chunks.length = 0;
    recording = null;
    stopStreamTracks(stream);
    detachListeners();
    stopRecorderQuietly();
    rejectPendingStop(new Error(CANCELLED_MESSAGE));
  };

  return { stop, cancel };
}

export async function startVoiceRecording(): Promise<VoiceRecordingStartResult> {
  if (!isVoiceRecordingSupported()) {
    return { ok: false, reason: "unsupported" };
  }

  let stream: MediaStream;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    return { ok: false, reason: mapMicrophoneError(error) };
  }

  let recorder: MediaRecorder;
  let session: VoiceRecordingSession;

  try {
    const preferredMimeType = pickSupportedMimeType();

    recorder = preferredMimeType
      ? new MediaRecorder(stream, { mimeType: preferredMimeType })
      : new MediaRecorder(stream);

    session = createRecordingSession(recorder, stream, preferredMimeType);
  } catch {
    stopStreamTracks(stream);
    return { ok: false, reason: "recorder" };
  }

  try {
    recorder.start(100);
  } catch {
    session.cancel();
    return { ok: false, reason: "recorder" };
  }

  return { ok: true, session };
}
