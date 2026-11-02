import { Outlet } from "react-router";

import { AuthGate } from "~/components/auth/auth-gate";
import { AppShell } from "~/components/layout/app-shell";

export default function AppLayout() {
  return (
    <AppShell>
      <AuthGate>
        <Outlet />
      </AuthGate>
    </AppShell>
  );
}
