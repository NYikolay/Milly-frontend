import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState, type PropsWithChildren } from "react";

import { AuthSessionError } from "~/lib/auth/errors";
import { AuthProvider } from "~/providers/auth-provider";
import { TelegramProvider } from "~/providers/telegram-provider";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) =>
              !(error instanceof AuthSessionError) && failureCount < 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <TelegramProvider>
          <AuthProvider>{children}</AuthProvider>
        </TelegramProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
