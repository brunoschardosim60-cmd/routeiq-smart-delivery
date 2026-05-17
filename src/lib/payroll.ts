// Lógica de remuneração e detecção automática de 2ª saída
import { drivers, type Driver, type RouteRow } from "./mock-data";

export interface PaidRoute extends RouteRow {
  tripIndex: number;        // 1 = primeira saída do dia, 2+ = saídas extras
  isSecondTripAuto: boolean; // true quando tripIndex >= 2
  payDaily: number;         // valor da diária (0 se for 2ª+ saída)
  payExtra: number;         // valor da 2ª saída (0 na primeira)
  payTotal: number;         // total pago nessa rota
  driver?: Driver;
}

/**
 * Identifica automaticamente 2ª saída: para cada (motorista, dia),
 * ordena rotas por horário de saída — a 1ª é a "diária", as demais
 * são "2ª saída" e usam o secondTripRate do motorista.
 */
export function computePayroll(routes: RouteRow[]): PaidRoute[] {
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  // Agrupar por motorista+dia
  const groups = new Map<string, RouteRow[]>();
  for (const r of routes) {
    const k = `${r.driverId}__${r.dateISO}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  const result: PaidRoute[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => a.departure.localeCompare(b.departure));
    sorted.forEach((r, idx) => {
      const drv = driverMap.get(r.driverId);
      const tripIndex = idx + 1;
      const isSecond = tripIndex >= 2;
      const payDaily = isSecond ? 0 : drv?.dailyRate ?? 0;
      const payExtra = isSecond ? drv?.secondTripRate ?? 0 : 0;
      result.push({
        ...r,
        tripIndex,
        isSecondTripAuto: isSecond,
        payDaily,
        payExtra,
        payTotal: payDaily + payExtra,
        driver: drv,
      });
    });
  }
  // ordenar por data desc + hora
  result.sort((a, b) =>
    a.dateISO === b.dateISO ? a.departure.localeCompare(b.departure) : b.dateISO.localeCompare(a.dateISO),
  );
  return result;
}

export interface DriverMonthlyMeta {
  driver: Driver;
  deliveries: number;       // entregas no mês (concluídas)
  routes: number;           // rotas no mês
  secondTrips: number;      // qtd de 2ª saídas
  target: number;           // meta mensal (entregas)
  pctTarget: number;        // % vs meta
  totalPaid: number;        // total a pagar no mês
  baseFromDaily: number;
  extraFromSecondTrips: number;
}

export function computeMonthlyMeta(
  paid: PaidRoute[],
  monthISO?: string, // "yyyy-mm" — se null, considera tudo
): DriverMonthlyMeta[] {
  const filtered = monthISO
    ? paid.filter((r) => r.dateISO.startsWith(monthISO))
    : paid;
  const byDriver = new Map<string, PaidRoute[]>();
  for (const r of filtered) {
    if (!byDriver.has(r.driverId)) byDriver.set(r.driverId, []);
    byDriver.get(r.driverId)!.push(r);
  }
  const out: DriverMonthlyMeta[] = [];
  for (const d of drivers) {
    const list = byDriver.get(d.id) ?? [];
    const deliveries = list.reduce((s, r) => s + r.done, 0);
    const secondTrips = list.filter((r) => r.isSecondTripAuto).length;
    const baseFromDaily = list.reduce((s, r) => s + r.payDaily, 0);
    const extraFromSecondTrips = list.reduce((s, r) => s + r.payExtra, 0);
    out.push({
      driver: d,
      deliveries,
      routes: list.length,
      secondTrips,
      target: d.monthlyTarget,
      pctTarget: d.monthlyTarget > 0 ? (deliveries / d.monthlyTarget) * 100 : 0,
      totalPaid: baseFromDaily + extraFromSecondTrips,
      baseFromDaily,
      extraFromSecondTrips,
    });
  }
  return out;
}

export function summarizeByCompany(metas: DriverMonthlyMeta[]) {
  const groups = { DBM: [] as DriverMonthlyMeta[], BS: [] as DriverMonthlyMeta[] };
  metas.forEach((m) => groups[m.driver.company].push(m));
  return (Object.keys(groups) as Array<"DBM" | "BS">).map((c) => {
    const list = groups[c];
    const deliveries = list.reduce((s, m) => s + m.deliveries, 0);
    const target = list.reduce((s, m) => s + m.target, 0);
    return {
      company: c,
      drivers: list.length,
      deliveries,
      target,
      pctTarget: target ? (deliveries / target) * 100 : 0,
      secondTrips: list.reduce((s, m) => s + m.secondTrips, 0),
      totalPaid: list.reduce((s, m) => s + m.totalPaid, 0),
      baseFromDaily: list.reduce((s, m) => s + m.baseFromDaily, 0),
      extraFromSecondTrips: list.reduce((s, m) => s + m.extraFromSecondTrips, 0),
    };
  });
}
