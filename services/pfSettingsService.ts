import { fetchWithAuth } from "@/lib/fetchWithAuth";
import type { PFSettings } from "@/lib/schemas";

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/punto-fiesta/settings`;

export async function getPFSettings(): Promise<PFSettings> {
  const res = await fetchWithAuth(BASE);
  return (await res.json()).data;
}

export async function updatePFSettings(data: {
  accountHolderName: string;
  cuil: string;
  alias: string;
  cbu: string;
  phone: string;
}): Promise<PFSettings> {
  const res = await fetchWithAuth(BASE, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return (await res.json()).data;
}
