import { api } from './apiClient';
import type { ApiSuccess } from './types';
import type { Alert } from '@/types';

type ServerAlert = {
  id: number;
  product_id: number;
  product_name: string | null;
  market_id: number;
  market_name: string | null;
  target_price: number;
  condition: 'above' | 'below';
  is_active: boolean;
  last_triggered_at: string | null;
  last_known_price: number | null;
  created_at: string | null;
};

function mapAlert(row: ServerAlert): Alert {
  return {
    id: String(row.id),
    commodityId: String(row.product_id),
    commodityName: row.product_name || 'Product',
    marketId: row.market_id,
    marketName: row.market_name || undefined,
    condition: row.condition,
    targetPrice: row.target_price,
    isActive: row.is_active,
    createdAt: row.created_at || new Date().toISOString(),
    lastTriggeredAt: row.last_triggered_at || undefined,
    lastKnownPrice: row.last_known_price ?? undefined,
  };
}

export async function fetchServerAlerts(): Promise<Alert[]> {
  const { data } = await api.get<ApiSuccess<{ alerts: ServerAlert[] }>>('/user/price-alerts');
  return data.data.alerts.map(mapAlert);
}

export async function createServerAlert(payload: {
  product_id: number;
  market_id: number;
  target_price: number;
  condition: 'above' | 'below';
}): Promise<Alert> {
  const { data } = await api.post<ApiSuccess<{ alert: ServerAlert }>>('/user/price-alerts', {
    ...payload,
    condition: payload.condition.toUpperCase(),
  });
  return mapAlert(data.data.alert);
}

export async function updateServerAlert(
  id: string | number,
  payload: Partial<{ target_price: number; condition: 'above' | 'below'; is_active: boolean }>
): Promise<Alert> {
  const body: Record<string, unknown> = { ...payload };
  if (payload.condition) {
    body.condition = payload.condition.toUpperCase();
  }
  const { data } = await api.put<ApiSuccess<{ alert: ServerAlert }>>(`/user/price-alerts/${id}`, body);
  return mapAlert(data.data.alert);
}

export async function deleteServerAlert(id: string | number): Promise<void> {
  await api.delete(`/user/price-alerts/${id}`);
}

export async function registerExpoPushToken(token: string): Promise<void> {
  await api.post('/user/device-token', { expo_push_token: token });
}

export async function registerPushTokens(payload: {
  expo_push_token?: string | null;
  fcm_token?: string | null;
}): Promise<void> {
  await api.post('/user/device-token', {
    expo_push_token: payload.expo_push_token || undefined,
    fcm_token: payload.fcm_token || undefined,
  });
}
