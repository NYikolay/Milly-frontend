import type { ReactElement } from "react";

import { BottomNavigationDock } from "~/components/home/bottom-navigation-dock";
import { AppShell } from "~/components/layout/app-shell";

import { ErrorScreen } from "./error-screen";
import type { ErrorScreenProps } from "./error-screen";

export interface AppErrorPageProps extends ErrorScreenProps {}

export function AppErrorPage(props: AppErrorPageProps): ReactElement {
  return (
    <AppShell>
      <ErrorScreen {...props} />
      <BottomNavigationDock active="home" />
    </AppShell>
  );
}
