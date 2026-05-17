export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const num = (v: number) => v.toLocaleString("pt-BR");
export const pct = (v: number) => `${v.toFixed(1)}%`;

export const today = () => {
  const d = new Date();
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
};

/** ISO de hoje no fuso local (yyyy-mm-dd) — evita off-by-one por UTC. */
export const todayISO = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Parse "yyyy-mm-dd" como data local (não UTC) — evita salto de dia em fusos negativos. */
export const parseISODate = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

/** Formata um "yyyy-mm" como "Maio de 2025" no fuso local. */
export const formatMonthLabel = (monthISO: string): string => {
  const d = parseISODate(`${monthISO}-01`);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

/** Diferença em dias entre dois ISOs (a - b), em fuso local. */
export const diffDaysISO = (a: string, b: string): number => {
  const da = parseISODate(a).getTime();
  const db = parseISODate(b).getTime();
  return (da - db) / 86400000;
};

/** Converte "yyyy-mm-dd" para "dd/mm/yyyy" sem cair em UTC. */
export const isoToBR = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
