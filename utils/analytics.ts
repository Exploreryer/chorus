type AnalyticsEvent =
  | 'popup_opened'
  | 'distribution_started'
  | 'distribution_completed'
  | 'distribution_cancelled'
  | 'platform_success'
  | 'platform_failure';

interface AnalyticsBucket {
  count: number;
  lastOccurredAt: string;
}

/**
 * Privacy-first local analytics foundation.
 * No prompt text or browsing data is stored or transmitted.
 * A remote provider can be wired here later with explicit consent.
 */
export async function track(
  event: AnalyticsEvent,
  properties: Record<string, string | number | boolean> = {}
): Promise<void> {
  const key = `analytics:${event}`;
  const current = await chrome.storage.local.get(key);
  const bucket = current[key] as AnalyticsBucket | undefined;

  await chrome.storage.local.set({
    [key]: {
      count: (bucket?.count ?? 0) + 1,
      lastOccurredAt: new Date().toISOString(),
    } satisfies AnalyticsBucket,
    'analytics:lastEvent': {
      event,
      properties,
      occurredAt: new Date().toISOString(),
    },
  });
}
