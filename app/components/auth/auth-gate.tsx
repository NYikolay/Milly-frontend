import type { PropsWithChildren } from "react";

import { AuthScreen } from "~/components/auth/auth-screen";
import { RouteSkeleton } from "~/components/layout/route-skeleton";
import { useAuth } from "~/providers/auth-provider";

export function AuthGate({ children }: PropsWithChildren) {
  const { status, reason, retry } = useAuth();

  if (status === "booting") {
    return <RouteSkeleton />;
  }

  if (status === "authenticated") {
    return <>{children}</>;
  }

  return <AuthScreen status={status} reason={reason} onRetry={retry} />;
}
