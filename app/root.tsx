import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { AppProviders } from "./providers/app-providers";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const app = window.Telegram && window.Telegram.WebApp;
                const inTelegram = Boolean(app && app.platform && app.platform !== "unknown");
                const scheme = inTelegram
                  ? app.colorScheme
                  : window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light";
                document.documentElement.dataset.appTheme = scheme;
              } catch {
                document.documentElement.dataset.appTheme = "light";
              }
            })();`,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AppProviders>
      <Outlet />
    </AppProviders>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-3 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tg-hint">
        Milly
      </p>
      <h1 className="text-2xl font-bold">{message}</h1>
      <p className="text-sm text-tg-hint">{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto rounded-xl bg-tg-secondary-bg p-3 text-xs text-tg-hint">
          <code>{stack}</code>
        </pre>
      )}
      <Link className="text-sm font-semibold text-tg-link" to="/">
        Back to home
      </Link>
    </main>
  );
}
