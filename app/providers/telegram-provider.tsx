import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import {
  getTelegramWebApp,
  isTelegramEnvironment,
  supportsVersion,
} from "~/lib/telegram/client";
import type {
  TelegramColorScheme,
  TelegramHapticImpactStyle,
  TelegramHapticNotificationType,
  TelegramInsets,
  TelegramThemeParams,
  TelegramUser,
  TelegramWebApp,
} from "~/lib/telegram/types";

const EMPTY_INSETS: TelegramInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const THEME_FIELDS = [
  "bg_color",
  "text_color",
  "hint_color",
  "link_color",
  "button_color",
  "button_text_color",
  "secondary_bg_color",
  "header_bg_color",
  "accent_text_color",
  "section_bg_color",
  "section_header_text_color",
  "subtitle_text_color",
  "destructive_text_color",
  "section_separator_color",
  "bottom_bar_bg_color",
] as const;

interface TelegramLayout {
  viewportStableHeight: number;
  safeAreaInset: TelegramInsets;
  contentSafeAreaInset: TelegramInsets;
  isExpanded: boolean;
  isFullscreen: boolean;
  isActive: boolean;
}

export interface TelegramHaptics {
  impact: (style?: TelegramHapticImpactStyle) => void;
  notification: (type: TelegramHapticNotificationType) => void;
  selection: () => void;
}

export interface TelegramContextValue extends TelegramLayout {
  webApp: TelegramWebApp | null;
  isAvailable: boolean;
  isTelegram: boolean;
  user: TelegramUser | null;
  platform: string;
  version: string;
  initData: string;
  colorScheme: TelegramColorScheme;
  themeParams: TelegramThemeParams;
  haptics: TelegramHaptics;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

const INITIAL_LAYOUT: TelegramLayout = {
  viewportStableHeight: 0,
  safeAreaInset: EMPTY_INSETS,
  contentSafeAreaInset: EMPTY_INSETS,
  isExpanded: false,
  isFullscreen: false,
  isActive: true,
};

function readLayout(app: TelegramWebApp): TelegramLayout {
  return {
    viewportStableHeight: app.viewportStableHeight,
    safeAreaInset: app.safeAreaInset ?? EMPTY_INSETS,
    contentSafeAreaInset: app.contentSafeAreaInset ?? EMPTY_INSETS,
    isExpanded: app.isExpanded,
    isFullscreen: app.isFullscreen ?? false,
    isActive: app.isActive ?? true,
  };
}

function getAppBackgroundColor(): string | null {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--app-bg")
    .trim();

  return value.length > 0 ? value : null;
}

function applyTelegramChrome(app: TelegramWebApp) {
  if (!isTelegramEnvironment(app) || !supportsVersion("6.1", app)) {
    return;
  }

  const background = getAppBackgroundColor();

  if (!background) {
    return;
  }

  app.setHeaderColor(
    supportsVersion("6.9", app)
      ? background
      : app.colorScheme === "light"
        ? "secondary_bg_color"
        : "bg_color",
  );
  app.setBackgroundColor(background);

  if (supportsVersion("7.10", app)) {
    app.setBottomBarColor?.(background);
  }
}

function applyTheme(app: TelegramWebApp) {
  const root = document.documentElement;

  for (const field of THEME_FIELDS) {
    const property = `--tg-theme-${field.replaceAll("_", "-")}`;
    const value = app.themeParams[field];

    if (value) {
      root.style.setProperty(property, value);
    } else {
      root.style.removeProperty(property);
    }
  }

  root.style.setProperty("--tg-color-scheme", app.colorScheme);
  root.dataset.tgScheme = app.colorScheme;

  if (isTelegramEnvironment(app)) {
    root.dataset.appTheme = app.colorScheme;
  }

  applyTelegramChrome(app);
}

function applyInsets(app: TelegramWebApp) {
  const safeArea = app.safeAreaInset ?? EMPTY_INSETS;
  const contentArea = app.contentSafeAreaInset ?? EMPTY_INSETS;
  const root = document.documentElement.style;

  root.setProperty("--app-inset-top", `${safeArea.top + contentArea.top}px`);
  root.setProperty("--app-inset-right", `${safeArea.right + contentArea.right}px`);
  root.setProperty("--app-inset-bottom", `${safeArea.bottom + contentArea.bottom}px`);
  root.setProperty("--app-inset-left", `${safeArea.left + contentArea.left}px`);
}

export function TelegramProvider({ children }: PropsWithChildren) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [layout, setLayout] = useState<TelegramLayout>(INITIAL_LAYOUT);
  const [colorScheme, setColorScheme] =
    useState<TelegramColorScheme>("light");
  const [themeParams, setThemeParams] = useState<TelegramThemeParams>({});

  useEffect(() => {
    const app = getTelegramWebApp();
    const inTelegram = isTelegramEnvironment(app);
    const media = inTelegram
      ? null
      : window.matchMedia("(prefers-color-scheme: dark)");

    const applyBrowserTheme = () => {
      if (media) {
        document.documentElement.dataset.appTheme = media.matches
          ? "dark"
          : "light";
      }
    };

    if (media) {
      applyBrowserTheme();
      media.addEventListener("change", applyBrowserTheme);
    }

    if (!app) {
      return () => {
        media?.removeEventListener("change", applyBrowserTheme);
      };
    }

    setWebApp(app);
    app.ready();

    if (!app.isExpanded) {
      app.expand();
    }

    if (supportsVersion("7.7", app)) {
      app.disableVerticalSwipes?.();
    }

    applyTheme(app);
    applyInsets(app);
    setColorScheme(app.colorScheme);
    setThemeParams({ ...app.themeParams });
    setLayout(readLayout(app));

    const handleThemeChanged = () => {
      applyTheme(app);
      setColorScheme(app.colorScheme);
      setThemeParams({ ...app.themeParams });
    };

    const handleViewportChanged = () => {
      setLayout(readLayout(app));
    };

    const handleSafeAreaChanged = () => {
      applyInsets(app);
      setLayout(readLayout(app));
    };

    const handleFullscreenChanged = () => {
      setLayout(readLayout(app));
    };

    const handleActivated = () => {
      setLayout((current) => ({ ...current, isActive: true }));
    };

    const handleDeactivated = () => {
      setLayout((current) => ({ ...current, isActive: false }));
    };

    app.onEvent("themeChanged", handleThemeChanged);
    app.onEvent("viewportChanged", handleViewportChanged);
    app.onEvent("safeAreaChanged", handleSafeAreaChanged);
    app.onEvent("contentSafeAreaChanged", handleSafeAreaChanged);
    app.onEvent("fullscreenChanged", handleFullscreenChanged);
    app.onEvent("activated", handleActivated);
    app.onEvent("deactivated", handleDeactivated);

    return () => {
      app.offEvent("themeChanged", handleThemeChanged);
      app.offEvent("viewportChanged", handleViewportChanged);
      app.offEvent("safeAreaChanged", handleSafeAreaChanged);
      app.offEvent("contentSafeAreaChanged", handleSafeAreaChanged);
      app.offEvent("fullscreenChanged", handleFullscreenChanged);
      app.offEvent("activated", handleActivated);
      app.offEvent("deactivated", handleDeactivated);
      media?.removeEventListener("change", applyBrowserTheme);
    };
  }, []);

  const haptics = useMemo<TelegramHaptics>(
    () => ({
      impact(style = "light") {
        if (webApp && supportsVersion("6.1", webApp)) {
          webApp.HapticFeedback?.impactOccurred(style);
        }
      },
      notification(type) {
        if (webApp && supportsVersion("6.1", webApp)) {
          webApp.HapticFeedback?.notificationOccurred(type);
        }
      },
      selection() {
        if (webApp && supportsVersion("6.1", webApp)) {
          webApp.HapticFeedback?.selectionChanged();
        }
      },
    }),
    [webApp],
  );

  const value = useMemo<TelegramContextValue>(
    () => ({
      webApp,
      isAvailable: webApp !== null,
      isTelegram: isTelegramEnvironment(webApp),
      user: webApp?.initDataUnsafe.user ?? null,
      platform: webApp?.platform ?? "",
      version: webApp?.version ?? "",
      initData: webApp?.initData ?? "",
      colorScheme,
      themeParams,
      ...layout,
      haptics,
    }),
    [webApp, colorScheme, themeParams, layout, haptics],
  );

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram(): TelegramContextValue {
  const context = useContext(TelegramContext);

  if (!context) {
    throw new Error("useTelegram must be used within TelegramProvider");
  }

  return context;
}
