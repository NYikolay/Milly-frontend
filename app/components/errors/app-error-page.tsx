import type { ReactElement } from "react";

import { BottomNavigation } from "~/components/home/bottom-navigation";
import { AppShell } from "~/components/layout/app-shell";

import { ErrorScreen } from "./error-screen";
import type { ErrorScreenProps } from "./error-screen";

export interface AppErrorPageProps extends ErrorScreenProps {}

export function AppErrorPage(props: AppErrorPageProps): ReactElement {
  return (
    <AppShell>
      <ErrorScreen {...props} />
      <div
        className="fixed inset-x-0 bottom-0 z-20"
        style={{
          paddingBottom: "max(30px, var(--app-inset-bottom))",
          paddingLeft: "var(--app-inset-left)",
          paddingRight: "var(--app-inset-right)",
        }}
      >
        <div className="mx-auto w-full max-w-md px-4">
          <BottomNavigation active="home" />
        </div>
      </div>
    </AppShell>
  );
}
