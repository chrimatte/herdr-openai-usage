export function cleanText(value, max = 100) {
  // Strip terminal and bidi control characters from remote labels.
  return typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/gu, '').slice(0, max) : '';
}

function normalizeWindow(value, kind) {
  if (!value || typeof value !== 'object') return null;
  const used = typeof value.usedPercent === 'number' && Number.isFinite(value.usedPercent) && value.usedPercent >= 0
    ? value.usedPercent : null;
  const minutes = Number.isInteger(value.windowDurationMins) && value.windowDurationMins > 0 ? value.windowDurationMins : null;
  const reset = Number.isFinite(value.resetsAt) && value.resetsAt > 0 && value.resetsAt < 8640000000000 ? value.resetsAt : null;
  return { kind, usedPercent: used, remainingPercent: used === null ? null : Math.max(0, 100 - used), durationMinutes: minutes, resetsAt: reset };
}

function normalizeCredits(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    hasCredits: typeof value.hasCredits === 'boolean' ? value.hasCredits : null,
    unlimited: typeof value.unlimited === 'boolean' ? value.unlimited : null,
    balance: typeof value.balance === 'string' ? cleanText(value.balance, 40) : null,
  };
}

export function normalizeSnapshot({ planType, quotas }, now = Date.now()) {
  if (!quotas || typeof quotas !== 'object' || Array.isArray(quotas)) throw new Error('Formato delle quote Codex non valido.');
  const byId = quotas.rateLimitsByLimitId;
  let entries = byId && typeof byId === 'object' && !Array.isArray(byId) ? Object.entries(byId) : [];
  entries = entries.filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value));
  if (!entries.length && quotas.rateLimits && typeof quotas.rateLimits === 'object') entries = [[quotas.rateLimits.limitId ?? 'codex', quotas.rateLimits]];
  const buckets = entries.map(([id, value]) => ({
    id: cleanText(id), name: cleanText(value.limitName) || (id === 'codex' ? 'Codex' : cleanText(id)),
    planType: cleanText(value.planType) || cleanText(planType),
    windows: [normalizeWindow(value.primary, 'primary'), normalizeWindow(value.secondary, 'secondary')].filter(Boolean),
    credits: normalizeCredits(value.credits), limitReached: cleanText(value.rateLimitReachedType) || null,
    spendControlReached: value.spendControlReached === true,
  }));
  const available = quotas.rateLimitResetCredits?.availableCount;
  return {
    fetchedAt: new Date(now).toISOString(), planType: cleanText(planType), buckets,
    ordinaryUsageAllowed: typeof quotas.ordinaryUsageAllowed === 'boolean' ? quotas.ordinaryUsageAllowed : null,
    resetCredits: Number.isInteger(available) && available >= 0 ? available : null,
  };
}

export function windowLabel(window) {
  const mins = window.durationMinutes;
  if (mins === 10080) return 'Settimana';
  if (mins === null) return window.kind === 'primary' ? 'Quota primaria' : 'Quota secondaria';
  if (mins % 1440 === 0) return `${mins / 1440} giorni`;
  if (mins % 60 === 0) return `${mins / 60} ore`;
  return `${mins} minuti`;
}

export function planLabel(value) {
  // Keep the server's tier identifier; do not infer price or entitlement from it.
  const labels = { pro: 'Pro', plus: 'Plus', free: 'Free', team: 'Team', business: 'Business', enterprise: 'Enterprise', edu: 'Edu' };
  return labels[value] || (value?.startsWith('pro') ? `Pro (${cleanText(value)})` : cleanText(value) || 'Non disponibile');
}

export const demoSnapshot = () => normalizeSnapshot({ planType: 'pro', quotas: {
  rateLimitsByLimitId: { codex: { primary: { usedPercent: 68, windowDurationMins: 10080, resetsAt: Math.floor(Date.now() / 1000) + 187200 }, credits: { hasCredits: false, unlimited: false, balance: '0' } } },
} });
