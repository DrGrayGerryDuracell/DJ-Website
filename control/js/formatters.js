export function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "nicht verfuegbar";
  }
  return new Intl.NumberFormat("de-DE").format(num);
}

export function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "nicht verfuegbar";
  }
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(num);
}

export function formatValue(value, unit) {
  if (value === null || value === undefined) {
    return "nicht verfuegbar";
  }
  if (unit === "EUR") {
    return formatCurrency(value);
  }
  if (unit === "%") {
    const num = Number(value);
    return Number.isFinite(num) ? `${num}%` : "nicht verfuegbar";
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
