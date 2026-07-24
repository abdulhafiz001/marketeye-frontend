import { api } from './apiClient';
import type { ApiSuccess } from './types';

export type WalletPayload = {
  wallet: {
    balance: number;
    min_claim: number;
    can_claim: boolean;
    progress: number;
    remaining_to_claim: number;
  };
  claims: Array<{
    id: number;
    amount: number;
    phone: string;
    status: string;
    admin_note: string | null;
    claimed_at: string | null;
    paid_at: string | null;
  }>;
};

export async function fetchWallet() {
  const { data } = await api.get<ApiSuccess<WalletPayload>>('/wallet');
  return data.data;
}

export async function claimAirtime(phone: string) {
  const { data } = await api.post<
    ApiSuccess<{
      claim: { id: number; amount: number; phone: string; status: string; claimed_at: string | null };
      wallet: { balance: number };
    }>
  >('/wallet/claim', { phone });
  return data.data;
}
