export type TelegramColorScheme = "light" | "dark";

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
  section_separator_color?: string;
  bottom_bar_bg_color?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export interface TelegramChat {
  id: number;
  type: "group" | "supergroup" | "channel";
  title: string;
  username?: string;
  photo_url?: string;
}

export interface TelegramInitData {
  query_id?: string;
  chat_join_request_query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: TelegramChat;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date?: number;
  hash?: string;
  signature?: string;
}

export interface TelegramInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type TelegramHapticImpactStyle =
  | "light"
  | "medium"
  | "heavy"
  | "rigid"
  | "soft";

export type TelegramHapticNotificationType =
  | "error"
  | "success"
  | "warning";

export interface TelegramHapticFeedback {
  impactOccurred(style: TelegramHapticImpactStyle): void;
  notificationOccurred(type: TelegramHapticNotificationType): void;
  selectionChanged(): void;
}

export interface TelegramButtonParams {
  text?: string;
  color?: string;
  text_color?: string;
  is_active?: boolean;
  is_visible?: boolean;
  has_shine_effect?: boolean;
  position?: "left" | "right" | "top" | "bottom";
  icon_custom_emoji_id?: string;
}

export interface TelegramBottomButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  hasShineEffect: boolean;
  position?: string;
  iconCustomEmojiId?: string;
  setText(text: string): TelegramBottomButton;
  setParams(params: TelegramButtonParams): TelegramBottomButton;
  onClick(callback: () => void): TelegramBottomButton;
  offClick(callback: () => void): TelegramBottomButton;
  show(): TelegramBottomButton;
  hide(): TelegramBottomButton;
  enable(): TelegramBottomButton;
  disable(): TelegramBottomButton;
  showProgress(leaveActive?: boolean): TelegramBottomButton;
  hideProgress(): TelegramBottomButton;
}

export interface TelegramBackButton {
  isVisible: boolean;
  show(): TelegramBackButton;
  hide(): TelegramBackButton;
  onClick(callback: () => void): TelegramBackButton;
  offClick(callback: () => void): TelegramBackButton;
}

export interface TelegramPopupButton {
  id?: string;
  type?: "default" | "ok" | "close" | "destructive";
  text?: string;
}

export interface TelegramPopupParams {
  title?: string;
  message: string;
  buttons?: TelegramPopupButton[];
}

export type TelegramEvent =
  | "themeChanged"
  | "viewportChanged"
  | "safeAreaChanged"
  | "contentSafeAreaChanged"
  | "fullscreenChanged"
  | "fullscreenFailed"
  | "activated"
  | "deactivated"
  | "mainButtonClicked"
  | "secondaryButtonClicked"
  | "backButtonClicked"
  | "settingsButtonClicked"
  | "popupClosed"
  | "invoiceClosed";

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramInitData;
  version: string;
  platform: string;
  colorScheme: TelegramColorScheme;
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  isActive?: boolean;
  isFullscreen?: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor?: string;
  backgroundColor?: string;
  bottomBarColor?: string;
  isClosingConfirmationEnabled?: boolean;
  isVerticalSwipesEnabled?: boolean;
  isOrientationLocked?: boolean;
  safeAreaInset?: TelegramInsets;
  contentSafeAreaInset?: TelegramInsets;
  MainButton: TelegramBottomButton;
  SecondaryButton?: TelegramBottomButton;
  BackButton?: TelegramBackButton;
  HapticFeedback?: TelegramHapticFeedback;
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(version: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  openTelegramLink?(url: string): void;
  enableClosingConfirmation?(): void;
  disableClosingConfirmation?(): void;
  enableVerticalSwipes?(): void;
  disableVerticalSwipes?(): void;
  requestFullscreen?(): void;
  exitFullscreen?(): void;
  showAlert?(message: string, callback?: () => void): void;
  showConfirm?(message: string, callback?: (confirmed: boolean) => void): void;
  showPopup?(
    params: TelegramPopupParams,
    callback?: (buttonId: string | null) => void,
  ): void;
  onEvent(event: TelegramEvent, handler: (payload?: unknown) => void): void;
  offEvent(event: TelegramEvent, handler: (payload?: unknown) => void): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}
