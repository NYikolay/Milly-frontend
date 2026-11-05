export interface TelegramProfile {
  telegram_id: number;
  is_bot: boolean | null;
  first_name: string;
  last_name: string | null;
  username: string | null;
  language_code: string | null;
  is_premium: boolean;
  added_to_attachment_menu: boolean | null;
  allows_write_to_pm: boolean | null;
  photo_url: string | null;
}

export interface AuthUser {
  id: number;
  timezone: string;
  created_at: string;
  telegram_profile: TelegramProfile;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface AuthResponse extends TokenResponse {
  user: AuthUser;
}

export interface ApiErrorEnvelope {
  error: true;
  code: string;
  message: string;
  description: string;
  details: unknown | null;
  request_id: string;
}
