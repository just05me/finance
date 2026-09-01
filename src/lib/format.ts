const usdFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const uzsFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatUsd(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}$${usdFormatter.format(Math.abs(value))}`;
}

export function formatUzs(value: number): string {
  return `${uzsFormatter.format(Math.round(value))} сум`;
}

export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

export function usdEquivalent(
  amountUsd: number,
  amountUzs: number,
  rate: number,
): number {
  if (!rate || rate <= 0) return amountUsd;
  return amountUsd + amountUzs / rate;
}

export function plannedUsdEquivalent(
  currency: "USD" | "UZS",
  planAmount: number,
  factAmount: number | null,
  rate: number,
): number {
  const effective = factAmount ?? planAmount;
  if (currency === "USD") return effective;
  return rate > 0 ? effective / rate : effective;
}

export function goalTargetUsd(
  currency: "USD" | "UZS",
  target: number,
  rate: number,
): number {
  if (currency === "USD") return target;
  return rate > 0 ? target / rate : target;
}

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const monthNamesGenitive = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export function monthLabel(year: number, month: number): string {
  const name = monthNames[month - 1] ?? "";
  return `${name} ${year}`;
}

export function shortMonthLabel(month: number): string {
  return monthNames[month - 1] ?? "";
}

export function monthGenitive(month: number): string {
  return monthNamesGenitive[month - 1] ?? "";
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getDate();
  return `${day} ${monthGenitive(d.getMonth() + 1)}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentYearMonth(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function relativeTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - d.getTime()) / 1000));
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
  return formatDate(d.toISOString().slice(0, 10));
}
