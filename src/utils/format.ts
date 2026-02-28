/** Returns the short currency symbol for a given ISO 4217 code, e.g. 'GBP' → '£'. */
export function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return '$';
  try {
    const parts = Intl.NumberFormat('en', { style: 'currency', currency }).formatToParts(0);
    return parts.find(p => p.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

export function formatLargeNumber(num: number | null | undefined): string {
  if (num == null) return '-';
  const isNegative = num < 0;
  const abs = Math.abs(num);
  let formatted: string;
  if (abs >= 1e12) formatted = `${(abs / 1e12).toFixed(2)}T`;
  else if (abs >= 1e9) formatted = `${(abs / 1e9).toFixed(2)}B`;
  else if (abs >= 1e6) formatted = `${(abs / 1e6).toFixed(2)}M`;
  else if (abs >= 1e3) formatted = `${(abs / 1e3).toFixed(2)}K`;
  else formatted = abs.toLocaleString();
  return isNegative ? `-${formatted}` : formatted;
}

export function formatPercent(val: number | null | undefined): string {
  if (val == null) return '-';
  return `${val.toFixed(1)}%`;
}

/** Format a large count without a $ prefix — use for share counts, volume, etc. */
export function formatCompactNumber(num: number | null | undefined): string {
  if (num == null) return '-';
  const abs = Math.abs(num);
  if (abs >= 1e12) return `${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${(abs / 1e3).toFixed(2)}K`;
  return abs.toLocaleString();
}
