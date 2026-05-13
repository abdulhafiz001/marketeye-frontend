import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { fetchProductDetail } from '@/services/catalogApi';
import { showPriceDeviceNotification } from '@/services/deviceNotifications';
import { getStoreState, useStore } from '@/store/useStore';
import type { Alert } from '@/types';

const COOLDOWN_MS = 6 * 60 * 60 * 1000;
const TICK_MS = 120_000;

/**
 * Runs in the background: checks active threshold alerts vs latest market prices,
 * pushes inbox notifications when crossed (with cooldown).
 */
export function AlertThresholdEvaluator() {
  const alertsLen = useStore((s) => s.alerts.length);
  const enabled = useStore((s) => s.alertsEnabled);
  const running = React.useRef(false);

  const run = React.useCallback(async () => {
    const { alertsEnabled: on, alerts } = getStoreState();
    if (!on || running.current) return;

    const active = alerts.filter((a) => a.isActive && a.marketId !== undefined && a.marketId !== null);
    if (!active.length) return;

    running.current = true;
    try {
      const byProduct = new Map<number, Alert[]>();
      for (const a of active) {
        const pid = Number(a.commodityId);
        if (!Number.isFinite(pid) || pid <= 0) continue;
        const list = byProduct.get(pid) ?? [];
        list.push(a);
        byProduct.set(pid, list);
      }

      for (const [productId, rules] of byProduct) {
        try {
          const detail = await fetchProductDetail(productId);
          for (const rule of rules) {
            const mid = Number(rule.marketId);
            const row = detail.markets.find((m) => m.market.id === mid);
            const price = row?.avg_price;
            if (price === undefined || price === null) continue;

            getStoreState().patchAlert(rule.id, { lastKnownPrice: price });

            const hit =
              rule.condition === 'below'
                ? price <= rule.targetPrice
                : price >= rule.targetPrice;
            const lastTs = rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).getTime() : 0;
            if (hit && Date.now() - lastTs > COOLDOWN_MS) {
              const label = rule.condition === 'below' ? 'went lower to around' : 'went higher to around';
              const mname = rule.marketName || 'that market';
              const message = `${rule.commodityName} at ${mname} ${label} ₦${Number(price).toLocaleString()} (your alert was ₦${Number(rule.targetPrice).toLocaleString()}).`;
              getStoreState().addNotification({
                id: `price:${rule.id}:${Date.now()}`,
                message,
                read: false,
                createdAt: new Date().toISOString(),
              });
              await showPriceDeviceNotification('Price alert', message);
              getStoreState().patchAlert(rule.id, { lastTriggeredAt: new Date().toISOString() });
            }
          }
        } catch {
          /* network / API */
        }
      }
    } finally {
      running.current = false;
    }
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    run();

    const interval = setInterval(run, TICK_MS);
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') run();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [enabled, alertsLen, run]);

  return null;
}
