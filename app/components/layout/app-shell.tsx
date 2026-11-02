import type { PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div
      className="app-shell flex flex-col bg-app-bg text-app-text"
      style={{
        paddingTop: "var(--app-inset-top)",
        paddingRight: "var(--app-inset-right)",
        paddingBottom: "var(--app-inset-bottom)",
        paddingLeft: "var(--app-inset-left)",
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
