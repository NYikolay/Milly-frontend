import type { ReactElement } from "react";
import { useLocation } from "react-router";

import { HomeSkeleton } from "~/components/home/home-skeleton";
import { TodayTasksSkeleton } from "~/components/tasks/today/today-tasks-skeleton";

const CONTENT_BOTTOM_PADDING =
  "calc(89px + max(0px, 30px - var(--app-inset-bottom)))";

export function RouteSkeleton(): ReactElement {
  const { pathname } = useLocation();

  if (pathname.startsWith("/tasks")) {
    return (
      <main className="flex flex-1 flex-col">
        <div
          className="flex flex-1 flex-col gap-2 px-4"
          style={{ paddingBottom: CONTENT_BOTTOM_PADDING }}
        >
          <TodayTasksSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <HomeSkeleton />
    </main>
  );
}
