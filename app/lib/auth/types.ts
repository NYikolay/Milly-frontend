export type AuthStatus =
  | "booting"
  | "authenticated"
  | "connection-error"
  | "reauth-required"
  | "no-init-data";

export type AuthFailureReason =
  | "network"
  | "server"
  | "init_data_missing"
  | "init_data_invalid"
  | "session_expired"
  | "forbidden"
  | "not_configured"
  | "request_failed";

export interface AuthFailure {
  status: Exclude<AuthStatus, "booting" | "authenticated">;
  reason: AuthFailureReason;
}
