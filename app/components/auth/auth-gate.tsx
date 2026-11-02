import type { PropsWithChildren } from "react";

import { AuthScreen } from "~/components/auth/auth-screen";
import { useAuth } from "~/providers/auth-provider";

export function AuthGate({ children }: PropsWithChildren) {
  const { status, reason, retry } = useAuth();

  if (status === "authenticated") {
    return <>{children}</>;
  }

  return <AuthScreen status={status} reason={reason} onRetry={retry} />;
}
