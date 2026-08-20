export interface Sub2ApiEnvelope<T> {
  code: number;
  message: string;
  reason?: string;
  data?: T;
}

export interface Sub2ApiUser {
  id: number;
  username: string;
  email: string;
  avatar_url?: string | null;
  role: 'admin' | 'user';
  balance: number;
  frozen_balance?: number;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface Sub2ApiAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  user: Sub2ApiUser;
}

export interface Sub2ApiTwoFactorChallenge {
  requires_2fa: true;
  temp_token: string;
  user_email_masked?: string;
}

export type Sub2ApiLoginResult = Sub2ApiAuthTokens | Sub2ApiTwoFactorChallenge;

export interface WalletAdjustment {
  userId: number;
  amount: number;
  operation: 'add' | 'subtract';
  idempotencyKey: string;
  notes: string;
}
