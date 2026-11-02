export type MicrophoneErrorReason =
  | "unsupported"
  | "permission-denied"
  | "no-microphone"
  | "recorder";

export type VoiceRecorderStatus =
  | "idle"
  | "preparing"
  | "recording"
  | "sending"
  | "error";

export type VoiceRecorderError = MicrophoneErrorReason | "upload";

export interface VoiceRecording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export interface VoiceRecordingSession {
  stop(): Promise<VoiceRecording>;
  cancel(): void;
}

export type MicrophonePreparation =
  | { ok: true }
  | { ok: false; reason: MicrophoneErrorReason };

export type VoiceRecordingStartResult =
  | { ok: true; session: VoiceRecordingSession }
  | { ok: false; reason: MicrophoneErrorReason };

export const MIN_RECORDING_MS = 300;
export const MAX_RECORDING_MS = 5 * 60_000;
export const MOCK_UPLOAD_DELAY_MS = 1200;
