import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { submitPriceBatch } from '@/services/userApi';

const QUEUE_KEY = 'marketeye_offline_submissions';

export type OfflineSubmissionDraft = {
  client_id: string;
  product_id: number;
  market_id: number;
  price: number;
  quantity_value?: number;
  quantity_unit?: string;
  notes?: string;
  product_name?: string;
  market_name?: string;
  created_at: string;
};

type Listener = (count: number) => void;

const listeners = new Set<Listener>();
let cached: OfflineSubmissionDraft[] | null = null;
let flushing = false;

function notify(count: number) {
  listeners.forEach((fn) => fn(count));
}

export function subscribeOfflineQueue(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function readQueue(): Promise<OfflineSubmissionDraft[]> {
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    cached = raw ? (JSON.parse(raw) as OfflineSubmissionDraft[]) : [];
  } catch {
    cached = [];
  }
  return cached;
}

async function writeQueue(items: OfflineSubmissionDraft[]) {
  cached = items;
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  notify(items.length);
}

export async function getOfflineQueueCount(): Promise<number> {
  return (await readQueue()).length;
}

export async function getOfflineQueue(): Promise<OfflineSubmissionDraft[]> {
  return [...(await readQueue())];
}

export async function enqueueOfflineSubmission(
  draft: Omit<OfflineSubmissionDraft, 'client_id' | 'created_at'> & { client_id?: string }
): Promise<OfflineSubmissionDraft> {
  const item: OfflineSubmissionDraft = {
    ...draft,
    client_id: draft.client_id || `local:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  };
  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);
  return item;
}

export async function flushOfflineQueue(): Promise<{ accepted: number; failed: number }> {
  if (flushing) {
    return { accepted: 0, failed: 0 };
  }

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    return { accepted: 0, failed: 0 };
  }

  const queue = await readQueue();
  if (!queue.length) {
    return { accepted: 0, failed: 0 };
  }

  flushing = true;
  try {
    const result = await submitPriceBatch(
      queue.map((item) => ({
        client_id: item.client_id,
        product_id: item.product_id,
        market_id: item.market_id,
        price: item.price,
        quantity_value: item.quantity_value,
        quantity_unit: item.quantity_unit,
        notes: item.notes,
      }))
    );

    const acceptedIds = new Set(
      result.results.filter((row) => row.ok && row.client_id).map((row) => String(row.client_id))
    );
    const keep = queue.filter((item) => !acceptedIds.has(item.client_id));
    await writeQueue(keep);

    return { accepted: result.accepted, failed: result.failed };
  } catch {
    return { accepted: 0, failed: queue.length };
  } finally {
    flushing = false;
  }
}

let netUnsub: (() => void) | null = null;

export function startOfflineQueueSync() {
  if (netUnsub) return;
  netUnsub = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      void flushOfflineQueue();
    }
  });
  void flushOfflineQueue();
}

export function stopOfflineQueueSync() {
  netUnsub?.();
  netUnsub = null;
}
