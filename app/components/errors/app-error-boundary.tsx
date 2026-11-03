import type { ReactElement } from "react";
import { useNavigate, useRevalidator } from "react-router";

import { classifyAppError, shouldReloadOnRetry } from "~/lib/errors/app-error";
import { shouldGoBack } from "~/lib/errors/navigation";

import { AppErrorPage } from "./app-error-page";

export interface AppErrorBoundaryProps {
  error: unknown;
}

export function AppErrorBoundary({
  error,
}: AppErrorBoundaryProps): ReactElement {
  const descriptor = classifyAppError(error);
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const retryPending = revalidator.state !== "idle";

  const handleHome = () => {
    navigate("/");
  };

  const handleBack = () => {
    if (shouldGoBack(window.history.state)) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const handleRetry = () => {
    if (shouldReloadOnRetry(error)) {
      window.location.reload();
      return;
    }

    void revalidator.revalidate();
  };

  return (
    <AppErrorPage
      descriptor={descriptor}
      retryPending={retryPending}
      onHome={handleHome}
      onBack={handleBack}
      onRetry={handleRetry}
    />
  );
}
