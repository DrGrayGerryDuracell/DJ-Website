export const formatNumber = (value: number): string => new Intl.NumberFormat("de-DE").format(value);

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export const formatPercent = (value: number): string => `${value}%`;

export const toStatusClass = (level: "ok" | "warn" | "info" | "error"): string => `is-${level}`;
