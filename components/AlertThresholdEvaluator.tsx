import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { fetchProductDetail } from '@/services/catalogApi';
import { acknowledgeServerAlert } from '@/services/alertsApi';
import { showPriceDeviceNotification } from '@/services/deviceNotifications';
import { getStoreState, useStore } from '@/store/useStore';
import type { Alert } from '@/types';

// 24 hours cooldown to prevent recurring spam pings for the same price condition
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const TICK_MS = 120_000;

// In-memory session tracking to guarantee no duplicate pings within the session
const sessionTriggeredMap = new Map<string, number>();

/**
 * Runs in the background: checks active threshold alerts vs latest market prices,
 * pushes inbox notifications when crossed (with cooldown and server persistence).
 */
export function AlertThresholdEvaluator() {
  const alertsLen = useStore((s) => s.alerts.length);
  const enabled = useStore((s) => s.alertsEnabled);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
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
            const sessionLast = sessionTriggeredMap.get(rule.id) || 0;
            const effectiveLast = Math.max(lastTs, sessionLast);

            const isInsideCooldown = effectiveLast > 0 && (Date.now() - effectiveLast < COOLDOWN_MS);
            const hasExistingUnread = getStoreState().notifications.some(
              (n) => n.alertId === String(rule.id) && !n.read && (Date.now() - new Date(n.createdAt).getTime() < COOLDOWN_MS)
            );

            if (hit && !isInsideCooldown && !hasExistingUnread) {
              const nowIso = new Date().toISOString();
              sessionTriggeredMap.set(rule.id, Date.now());

              const label = rule.condition === 'below' ? 'went lower to around' : 'went higher to around';
              const mname = rule.marketName || 'that market';
              const message = `${rule.commodityName} at ${mname} ${label} ₦${Number(price).toLocaleString()} (your alert was ₦${Number(rule.targetPrice).toLocaleString()}).`;

              getStoreState().addNotification({
                id: `price:${rule.id}:${Date.now()}`,
                alertId: String(rule.id),
                message,
                read: false,
                acknowledged: false,
                createdAt: nowIso,
              });

              await showPriceDeviceNotification('Price alert', message, {
                screen: 'PriceWatch',
                initialTab: 'inbox',
                alertId: rule.id,
              });
              getStoreState().patchAlert(rule.id, { lastTriggeredAt: nowIso, lastKnownPrice: price });

              // Persist trigger timestamp to backend if authenticated
              if (isAuthenticated && /^\d+$/.test(rule.id)) {
                acknowledgeServerAlert(rule.id, 'acknowledge').catch(() => {});
              }
            }
          }
        } catch {
          /* network / API */
        }
      }
    } finally {
      running.current = false;
    }
  }, [isAuthenticated]);

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
