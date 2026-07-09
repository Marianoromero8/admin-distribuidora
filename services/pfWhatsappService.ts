import type { PFWhatsappStatus } from "@/lib/schemas";

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/punto-fiesta/whatsapp/status`;

export async function getWhatsAppStatus(): Promise<PFWhatsappStatus> {
  const res = await fetch(BASE);
  return (await res.json()).data;
}
