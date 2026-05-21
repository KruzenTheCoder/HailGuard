// HailGuard is South Africa only — every amount is ZAR.

const ZAR_FORMAT = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

export function formatZAR(amount: number): string {
  try {
    return ZAR_FORMAT.format(amount);
  } catch {
    return `R ${amount.toFixed(2)}`;
  }
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}
