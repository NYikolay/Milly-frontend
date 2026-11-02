import type { MicrophoneErrorReason, MicrophonePreparation } from "./types";

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

async function queryMicrophonePermission(): Promise<PermissionState | null> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.permissions?.query !== "function"
  ) {
    return null;
  }

  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return status.state;
  } catch {
    return null;
  }
}

export function isVoiceRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

export async function prepareMicrophone(): Promise<MicrophonePreparation> {
  if (!isVoiceRecordingSupported()) {
    return { ok: false, reason: "unsupported" };
  }

  const permission = await queryMicrophonePermission();

  if (permission === "granted") {
    return { ok: true };
  }

  if (permission === "denied") {
    return { ok: false, reason: "permission-denied" };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stopStreamTracks(stream);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: mapMicrophoneError(error) };
  }
}
