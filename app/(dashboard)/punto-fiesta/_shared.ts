// ─── Tipos, constantes y helpers compartidos entre los tabs de Punto Fiesta ──

export type Tab = "summary" | "orders" | "products" | "categories" | "clients" | "ads";
export type StatusFilter = "ALL" | "PENDING" | "ACCEPTED" | "DECLINED" | "PAID";
export type DeliveryFilter = "ALL" | "PICKUP" | "DELIVERY";

export const PAGE_SIZE = 15;

export const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "PENDING", label: "Pendientes" },
  { key: "ACCEPTED", label: "Aceptados" },
  { key: "PAID", label: "Cobrados" },
  { key: "DECLINED", label: "Rechazados" },
];

export const DELIVERY_TABS: { key: DeliveryFilter; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "PICKUP", label: "🏪 Retiro en el local" },
  { key: "DELIVERY", label: "🚚 Envío a domicilio" },
];

export const DELIVERY_LABEL: Record<string, string> = {
  PICKUP: "🏪 Retiro en el local",
  DELIVERY: "🚚 Envío a domicilio",
};

export const DELIVERY_ICON: Record<string, string> = {
  PICKUP: "🏪",
  DELIVERY: "🚚",
};

export const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-600",
  PAID: "bg-indigo-100 text-indigo-700",
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptado",
  DECLINED: "Rechazado",
  PAID: "Cobrado",
};

export function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatOrderNumber(n: number) {
  return `#${String(n).padStart(4, "0")}`;
}

export function fmtMoney(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function whatsappLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

let sharedAudioCtx: AudioContext | null = null;

export function playNotificationSound() {
  try {
    if (!sharedAudioCtx) sharedAudioCtx = new AudioContext();
    const ctx = sharedAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
