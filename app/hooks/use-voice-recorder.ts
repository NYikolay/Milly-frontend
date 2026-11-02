import { useCallback, useEffect, useRef, useState } from "react";

import { prepareMicrophone } from "~/lib/voice/microphone";
import { MAX_RECORDING_MS, MIN_RECORDING_MS } from "~/lib/voice/types";
import type {
  MicrophonePreparation,
  VoiceRecorderError,
  VoiceRecorderStatus,
  VoiceRecording,
  VoiceRecordingSession,
  VoiceRecordingStartResult,
} from "~/lib/voice/types";
import { uploadVoiceTask } from "~/lib/voice/upload-voice-task";
import { startVoiceRecording } from "~/lib/voice/voice-recorder";

export interface UseVoiceRecorderOptions {
  onSendSuccess?: (recording: VoiceRecording) => void;
  onSendError?: (error: VoiceRecorderError) => void;
}

export interface UseVoiceRecorderResult {
  status: VoiceRecorderStatus;
  error: VoiceRecorderError | null;
  prepare: () => Promise<void>;
  start: () => Promise<void>;
  stopAndSend: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }

  const { name } = error as { name?: unknown };
  return name === "AbortError";
}

export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {},
): UseVoiceRecorderResult {
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle");
  const [error, setError] = useState<VoiceRecorderError | null>(null);

  const statusRef = useRef<VoiceRecorderStatus>("idle");
  const sessionRef = useRef<VoiceRecordingSession | null>(null);
  const sessionPromiseRef =
    useRef<Promise<VoiceRecordingStartResult> | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(false);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const onSendSuccessRef = useRef(options.onSendSuccess);
  const onSendErrorRef = useRef(options.onSendError);

  const updateStatus = useCallback((next: VoiceRecorderStatus): void => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const abortUpload = useCallback((): void => {
    const controller = uploadAbortRef.current;
    uploadAbortRef.current = null;
    controller?.abort();
  }, []);

  const cancel = useCallback((): void => {
    generationRef.current += 1;
    cancelledRef.current = true;

    abortUpload();

    const session = sessionRef.current;
    sessionRef.current = null;
    session?.cancel();

    const pending = sessionPromiseRef.current;
    sessionPromiseRef.current = null;

    if (pending) {
      void pending.then(
        (result) => {
          if (result.ok) {
            result.session.cancel();
          }
        },
        () => {},
      );
    }

    setError(null);
    updateStatus("idle");
  }, [abortUpload, updateStatus]);

  const reset = useCallback((): void => {
    cancel();
    setError(null);
    updateStatus("idle");
  }, [cancel, updateStatus]);

  const prepare = useCallback(async (): Promise<void> => {
    const current = statusRef.current;

    if (current === "recording" || current === "sending") {
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;

    updateStatus("preparing");
    setError(null);

    let result: MicrophonePreparation;

    try {
      result = await prepareMicrophone();
    } catch {
      if (generationRef.current !== generation || !mountedRef.current) {
        return;
      }

      setError("recorder");
      updateStatus("error");
      return;
    }

    if (generationRef.current !== generation || !mountedRef.current) {
      return;
    }

    if (!result.ok) {
      setError(result.reason);
      updateStatus("error");
      return;
    }

    updateStatus("idle");
  }, [updateStatus]);

  const start = useCallback(async (): Promise<void> => {
    if (statusRef.current !== "idle") {
      return;
    }

    const generation = generationRef.current;

    cancelledRef.current = false;
    updateStatus("recording");

    const pending = startVoiceRecording();
    sessionPromiseRef.current = pending;

    let result: VoiceRecordingStartResult;

    try {
      result = await pending;
    } catch {
      if (generationRef.current !== generation || !mountedRef.current) {
        return;
      }

      if (sessionPromiseRef.current === pending) {
        sessionPromiseRef.current = null;
      }

      setError("recorder");
      updateStatus("error");
      return;
    }

    if (!result.ok) {
      if (generationRef.current !== generation || !mountedRef.current) {
        return;
      }

      if (sessionPromiseRef.current === pending) {
        sessionPromiseRef.current = null;
      }

      setError(result.reason);
      updateStatus("error");
      return;
    }

    if (
      generationRef.current !== generation ||
      !mountedRef.current ||
      cancelledRef.current
    ) {
      result.session.cancel();

      if (sessionPromiseRef.current === pending) {
        sessionPromiseRef.current = null;
      }

      return;
    }

    sessionRef.current = result.session;
  }, [updateStatus]);

  const stopAndSend = useCallback(async (): Promise<void> => {
    if (statusRef.current !== "recording") {
      return;
    }

    const generation = generationRef.current;

    updateStatus("sending");

    const pending = sessionPromiseRef.current;

    if (!pending) {
      updateStatus("idle");
      return;
    }

    let result: VoiceRecordingStartResult;

    try {
      result = await pending;
    } catch {
      if (generationRef.current !== generation || !mountedRef.current) {
        return;
      }

      if (sessionPromiseRef.current === pending) {
        sessionPromiseRef.current = null;
      }

      setError("recorder");
      updateStatus("error");
      return;
    }

    if (!result.ok) {
      if (generationRef.current !== generation || !mountedRef.current) {
        return;
      }

      if (sessionPromiseRef.current === pending) {
        sessionPromiseRef.current = null;
      }

      setError(result.reason);
      updateStatus("error");
      return;
    }

    if (generationRef.current !== generation || !mountedRef.current) {
      result.session.cancel();

      if (sessionPromiseRef.current === pending) {
        sessionPromiseRef.current = null;
      }

      return;
    }

    const session = result.session;

    let recording: VoiceRecording;

    try {
      recording = await session.stop();
    } catch {
      if (sessionRef.current === session) {
        sessionRef.current = null;
      }

      if (sessionPromiseRef.current === pending) {
        sessionPromiseRef.current = null;
      }

      if (generationRef.current !== generation || !mountedRef.current) {
        return;
      }

      setError("recorder");
      updateStatus("error");
      return;
    }

    if (sessionRef.current === session) {
      sessionRef.current = null;
    }

    if (sessionPromiseRef.current === pending) {
      sessionPromiseRef.current = null;
    }

    if (generationRef.current !== generation || !mountedRef.current) {
      return;
    }

    if (recording.durationMs < MIN_RECORDING_MS || recording.blob.size === 0) {
      updateStatus("idle");
      return;
    }

    const controller = new AbortController();
    uploadAbortRef.current = controller;

    try {
      await uploadVoiceTask(recording, { signal: controller.signal });
    } catch (uploadError) {
      if (uploadAbortRef.current === controller) {
        uploadAbortRef.current = null;
      }

      if (isAbortError(uploadError)) {
        return;
      }

      if (generationRef.current !== generation || !mountedRef.current) {
        return;
      }

      setError("upload");
      updateStatus("error");

      try {
        onSendErrorRef.current?.("upload");
      } catch {}

      return;
    }

    if (uploadAbortRef.current === controller) {
      uploadAbortRef.current = null;
    }

    if (generationRef.current !== generation || !mountedRef.current) {
      return;
    }

    try {
      onSendSuccessRef.current?.(recording);
    } catch {
      setError("upload");
      updateStatus("error");
    }
  }, [updateStatus]);

  useEffect(() => {
    onSendSuccessRef.current = options.onSendSuccess;
    onSendErrorRef.current = options.onSendError;
  });

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      cancelledRef.current = true;

      const controller = uploadAbortRef.current;
      uploadAbortRef.current = null;
      controller?.abort();

      const session = sessionRef.current;
      sessionRef.current = null;
      session?.cancel();

      const pending = sessionPromiseRef.current;
      sessionPromiseRef.current = null;

      if (pending) {
        void pending.then(
          (result) => {
            if (result.ok) {
              result.session.cancel();
            }
          },
          () => {},
        );
      }
    };
  }, []);

  useEffect(() => {
    if (status !== "recording") {
      return;
    }

    const timer = window.setTimeout(() => {
      void stopAndSend();
    }, MAX_RECORDING_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [status, stopAndSend]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = (): void => {
      if (
        document.visibilityState === "hidden" &&
        statusRef.current === "recording"
      ) {
        cancel();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cancel]);

  return { status, error, prepare, start, stopAndSend, cancel, reset };
}
