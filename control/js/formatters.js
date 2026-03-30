export function formatNumber(value) {
  return new Intl.NumberFormat("de-DE").format(Number(value || 0));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function formatValue(value, unit) {
  if (unit === "EUR") {
    return formatCurrency(value);
  }
  if (unit === "%") {
    return `${value}%`;
  }
  if (typeof value === "number") {
    return formatNumber(value);
  }
  return String(value ?? "-");
}

export function trendClass(trend) {
  if (trend === "up") return "is-up";
  if (trend === "down") return "is-down";
  return "is-neutral";
}

export function levelClass(level) {
  if (level === "ok") return "is-ok";
  if (level === "warn") return "is-warn";
  if (level === "error") return "is-error";
  return "is-info";
}
