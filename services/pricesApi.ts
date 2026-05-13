import { api } from './apiClient';
import type { ApiSuccess } from './types';

export async function fetchTrending() {
  const { data } = await api.get<ApiSuccess<{ trending: Array<{ product: any; change_percent: number }> }>>(
    '/prices/trending'
  );
  return data.data.trending;
}

export async function fetchCompare(productId: number) {
  const { data } = await api.get<
    ApiSuccess<{
      product: { id: number; name: string; unit: string };
      markets: Array<{
        market: { id: number; name: string; area: string | null; lat: number | null; lng: number | null };
        avg_price: number;
        snapshot_date: string;
      }>;
    }>
  >('/prices/compare', { params: { product_id: productId } });
  return data.data;
}
