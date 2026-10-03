export function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1000000) {
    const k = n / 1000;
    return (k % 1 === 0 ? k : k.toFixed(1)) + "K";
  }
  const m = n / 1000000;
  return (m % 1 === 0 ? m : m.toFixed(1)) + "M";
}

export function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${formatNumber(amount)}`;
}
