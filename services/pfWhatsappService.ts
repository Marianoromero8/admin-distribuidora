import { fetchWithAuth } from "@/lib/fetchWithAuth";
import type { PFWhatsappStatus } from "@/lib/schemas";

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/punto-fiesta/whatsapp`;

export async function getWhatsAppStatus(): Promise<PFWhatsappStatus> {
  const res = await fetchWithAuth(`${BASE}/status`);
  return (await res.json()).data;
}

export async function getWhatsAppQr(): Promise<string | null> {
  const res = await fetchWithAuth(`${BASE}/qr`);
  return (await res.json()).data.qr;
}

export async function reconnectWhatsApp(): Promise<PFWhatsappStatus> {
  const res = await fetchWithAuth(`${BASE}/reconnect`, { method: "POST" });
  return (await res.json()).data;
}
