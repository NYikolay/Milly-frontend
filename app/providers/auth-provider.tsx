import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import type { AuthUser } from "~/lib/api/types";
import {
  fetchCurrentUser,
  loginWithInitData,
  refreshAccessToken,
} from "~/lib/auth/auth-api";
import {
  resetAuthFailureNotification,
  setAuthFailureListener,
} from "~/lib/auth/auth-events";
import { bootstrapAuth } from "~/lib/auth/bootstrap-auth";
import { clearAccessToken } from "~/lib/auth/token-store";
import type {
  AuthFailure,
  AuthFailureReason,
  AuthStatus,
} from "~/lib/auth/types";
import type { TelegramHapticNotificationType } from "~/lib/telegram/types";
import { useTelegram } from "~/providers/telegram-provider";

const AUTH_TELEGRAM_INIT_TIMEOUT_MS = 8000;

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  reason: AuthFailureReason | null;
}

const INITIAL_AUTH_STATE: AuthState = {
  status: "booting",
  user: null,
  reason: null,
};

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  reason: AuthFailureReason | null;
  retry: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isFailureStatus(status: AuthStatus): boolean {
  return (
    status === "connection-error" ||
    status === "reauth-required" ||
    status === "no-init-data"
  );
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { isAvailable, initData, isActive, haptics } = useTelegram();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(INITIAL_AUTH_STATE);

  const stateRef = useRef<AuthState>(INITIAL_AUTH_STATE);
  const initDataRef = useRef(initData);
  const isActiveRef = useRef(isActive);
  const hapticsRef = useRef(haptics);
  const autoBootstrapStartedRef = useRef(false);
  const bootstrapInFlightRef = useRef(false);

  stateRef.current = state;
  initDataRef.current = initData;
  isActiveRef.current = isActive;
  hapticsRef.current = haptics;

  const playHaptic = useCallback(
    (type: TelegramHapticNotificationType) => {
      if (isActiveRef.current !== false) {
        hapticsRef.current.notification(type);
      }
    },
    [],
  );

  const applyFailure = useCallback(
    (failure: AuthFailure) => {
      if (failure.status === "connection-error") {
        setState((current) => ({
          status: failure.status,
          user: current.user,
          reason: failure.reason,
        }));
      } else {
        clearAccessToken();
        queryClient.clear();
        setState({
          status: failure.status,
          user: null,
          reason: failure.reason,
        });
      }

      playHaptic("error");
    },
    [playHaptic, queryClient],
  );

  const runBootstrap = useCallback(async () => {
    if (bootstrapInFlightRef.current) {
      return;
    }

    bootstrapInFlightRef.current = true;

    const previousStatus = stateRef.current.status;
    const shouldPlaySuccessHaptic = isFailureStatus(previousStatus);

    setState((current) => ({
      ...current,
      status: "booting",
      reason: null,
    }));

    try {
      const result = await bootstrapAuth({
        initData: initDataRef.current,
        login: loginWithInitData,
        refresh: refreshAccessToken,
        fetchMe: fetchCurrentUser,
      });

      if (result.status === "authenticated") {
        setState({
          status: "authenticated",
          user: result.user,
          reason: null,
        });
        resetAuthFailureNotification();

        if (shouldPlaySuccessHaptic) {
          playHaptic("success");
        }

        return;
      }

      if (result.status === "connection-error") {
        setState((current) => ({
          status: "connection-error",
          user: current.user,
          reason: result.reason,
        }));
        playHaptic("error");

        return;
      }

      clearAccessToken();
      queryClient.clear();
      setState({
        status: result.status,
        user: null,
        reason: result.reason,
      });
      playHaptic("error");
    } finally {
      bootstrapInFlightRef.current = false;
    }
  }, [playHaptic, queryClient]);

  const retry = useCallback(() => {
    if (stateRef.current.status === "booting") {
      return;
    }

    resetAuthFailureNotification();
    void runBootstrap();
  }, [runBootstrap]);

  useEffect(() => {
    setAuthFailureListener(applyFailure);

    return () => {
      setAuthFailureListener(null);
    };
  }, [applyFailure]);

  useEffect(() => {
    if (autoBootstrapStartedRef.current) {
      return;
    }

    if (isAvailable) {
      autoBootstrapStartedRef.current = true;
      void runBootstrap();

      return;
    }

    const timer = window.setTimeout(() => {
      if (autoBootstrapStartedRef.current) {
        return;
      }

      autoBootstrapStartedRef.current = true;
      void runBootstrap();
    }, AUTH_TELEGRAM_INIT_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [isAvailable, runBootstrap]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      reason: state.reason,
      retry,
      isAuthenticated: state.status === "authenticated",
    }),
    [state, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
