export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

/**
 * Semantic tint classes for alerts and status badges.
 * Tints are derived from the design tokens via color-mix so they stay
 * consistent with the centralised palette (no raw Tailwind palette).
 */
export const statusTint: Record<Tone, string> = {
  success:
    'bg-[color-mix(in_oklch,var(--color-success)_12%,white)] text-[var(--color-success)] border-[color-mix(in_oklch,var(--color-success)_35%,transparent)]',
  warning:
    'bg-[color-mix(in_oklch,var(--color-warning)_14%,white)] text-[color-mix(in_oklch,var(--color-warning)_55%,black)] border-[color-mix(in_oklch,var(--color-warning)_40%,transparent)]',
  error:
    'bg-[color-mix(in_oklch,var(--color-error)_12%,white)] text-[var(--color-error)] border-[color-mix(in_oklch,var(--color-error)_35%,transparent)]',
  info:
    'bg-[color-mix(in_oklch,var(--color-info)_12%,white)] text-[var(--color-info)] border-[color-mix(in_oklch,var(--color-info)_35%,transparent)]',
  neutral: 'bg-paper-2 text-text-secondary border-border',
};

interface StatusTheme {
  label: string;
  tone: Tone;
}

const statusMap: Record<string, { label?: string; tone: Tone }> = {
  // Order statuses
  pending: { tone: 'warning' },
  processing: { tone: 'warning' },
  confirmed: { tone: 'success' },
  shipped: { tone: 'info' },
  in_transit: { tone: 'info', label: 'In Transit' },
  out_for_delivery: { tone: 'info', label: 'Out for Delivery' },
  delivered: { tone: 'success' },
  completed: { tone: 'success' },
  cancelled: { tone: 'error' },
  failed: { tone: 'error' },
  refund_requested: { tone: 'warning', label: 'Refund Requested' },
  refunded: { tone: 'info' },
  returned: { tone: 'info' },
  lost: { tone: 'error', label: 'Lost in Transit' },

  // Payment methods
  cod: { tone: 'neutral', label: 'Cash on Delivery' },
  jazzcash: { tone: 'neutral', label: 'JazzCash' },
  easypaisa: { tone: 'neutral', label: 'EasyPaisa' },

  // Payment status
  paid: { tone: 'success' },
  pending_payment: { tone: 'warning', label: 'Pending Payment' },
  awaiting_cod: { tone: 'info', label: 'Awaiting COD' },

  // Refund statuses
  requested: { tone: 'warning' },
  approved: { tone: 'success' },
  rejected: { tone: 'error' },

  // Inventory
  in_stock: { tone: 'success', label: 'In Stock' },
  out_of_stock: { tone: 'error', label: 'Out of Stock' },
};

function humanize(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getStatusTheme(status: string): StatusTheme {
  const key = String(status ?? '').toLowerCase();
  const found = statusMap[key];
  const label = found?.label ?? (key ? humanize(key) : 'Unknown');
  return { label, tone: found?.tone ?? 'neutral' };
}

/**
 * Solid (full-strength) token colour per tone — used for chart fills,
 * distribution bars, and other elements that need a saturated fill rather
 * than the light status-tint used on badges/alerts.
 */
export const toneSolid: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  neutral: 'bg-border-strong',
};

/**
 * Map an admin audit action string to a semantic tone so the audit log
 * reuses the same centralised palette instead of a bespoke colour map.
 */
export function getAuditActionTone(action: string): Tone {
  const a = String(action ?? '').toLowerCase();
  if (a.includes('created') || a.includes('enabled')) return 'success';
  if (a.includes('updated') || a.includes('edited')) return 'info';
  if (a.includes('deleted') || a.includes('disabled')) return 'error';
  if (a.includes('refund')) return 'warning';
  if (a.includes('payment') || a.includes('shipped') || a.includes('delivered')) return 'info';
  return 'neutral';
}
