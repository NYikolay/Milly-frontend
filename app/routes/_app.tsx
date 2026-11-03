import { Outlet } from "react-router";

import type { Route } from "./+types/_app";
import { AuthGate } from "~/components/auth/auth-gate";
import { AppErrorBoundary } from "~/components/errors/app-error-boundary";
import { AppShell } from "~/components/layout/app-shell";

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <AppErrorBoundary error={error} />;
}

export default function AppLayout() {
  return (
    <AppShell>
      <AuthGate>
        <Outlet />
      </AuthGate>
    </AppShell>
  );
}
