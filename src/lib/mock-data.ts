// Mock data — RouteIQ (zerado: sem dados de exemplo)
export type DriverStatus = "ativo" | "inativo" | "em_rota" | "disponivel";
export type RouteStatus = "em_andamento" | "atrasado" | "concluido" | "problema";
export type DeliveryStatus = "pendente" | "entregue" | "tentativa" | "problema" | "devolvido";
export type Company = "DBM" | "BS";

export interface Driver {
  id: string;
  name: string;
  initials: string;
  vehicle: string;
  plate: string;
  status: DriverStatus;
  company: Company;
  dailyRate: number;
  secondTripRate: number;
  monthlyTarget: number;
  deliveriesToday: number;
  kmToday: number;
  lastActivity: string;
  admissionDate: string;
  totalDeliveries: number;
  totalDays: number;
  totalKm: number;
  avgKmL: number;
  cnh: string;
  phone: string;
  cpf: string;
}

export const drivers: Driver[] = [];
export const meDriver: Driver = {
  id: "", name: "", initials: "", vehicle: "", plate: "",
  status: "disponivel", company: "BS",
  dailyRate: 0, secondTripRate: 0, monthlyTarget: 0,
  deliveriesToday: 0, kmToday: 0, lastActivity: "",
  admissionDate: "", totalDeliveries: 0, totalDays: 0, totalKm: 0,
  avgKmL: 0, cnh: "", phone: "", cpf: "",
};

export interface RouteRow {
  id: string;
  code: string;
  date: string;
  dateISO: string;
  driverId: string;
  driverName: string;
  company: Company;
  origin: string;
  totalDeliveries: number;
  done: number;
  km: number;
  duration: string;
  cost: number;
  revenue: number;
  status: RouteStatus;
  departure: string;
  expectedReturn: string;
  isSecondTrip: boolean;
}

export const routesData: RouteRow[] = [];

export interface DeliveryStop {
  seq: number;
  address: string;
  client: string;
  productType: string;
  scheduled: string;
  done?: string;
  status: DeliveryStatus;
  note?: string;
}

export const sampleStops: DeliveryStop[] = [];

export const last7Deliveries: { day: string; entregas: number }[] = [];
export const last7Revenue: { day: string; faturamento: number }[] = [];
export const last4WeeksFinance: { week: string; faturamento: number; custo: number; lucro: number }[] = [];
export const margin30d: { day: number; margem: number }[] = [];
export const fuelPrice60d: { day: number; preco: number }[] = [];

export interface Refuel {
  id: string;
  date: string;
  driverName: string;
  vehicle: string;
  plate: string;
  liters: number;
  pricePerL: number;
  total: number;
  odometer: number;
  kmSinceLast: number;
}
export const refuels: Refuel[] = [];

export const driverWeekly: { day: string; entregas: number }[] = [];
export const driverMonthlyEarnings: { week: string; ganho: number }[] = [];
export const top10Months: { mes: string; entregas: number }[] = [];
export const driverMonthlyTable: { mes: string; dias: number; entregas: number; km: number; ganho: number }[] = [];
export const alerts: { type: string; driver: string; desc: string; time: string }[] = [];
export const ranking: (Driver & { done: number; pct: number })[] = [];
export const yearlyDeliveries: { mes: string; entregas: number }[] = [];
export const driverWeeklyKm: { week: string; km: number }[] = [];
export const fuelByVehicle: { veiculo: string; litros: number }[] = [];

export type NotificationType = "atraso" | "problema" | "combustivel" | "rota" | "financeiro" | "sistema";
export type NotificationAudience = "admin" | "motorista";

export interface AppNotification {
  id: string;
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  link?: { to: string; params?: Record<string, string> };
}

export const notificationsData: AppNotification[] = [];
