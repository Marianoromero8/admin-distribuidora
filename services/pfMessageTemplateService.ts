import { fetchWithAuth } from "@/lib/fetchWithAuth";
import type { PFMessageTemplate } from "@/lib/schemas";

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/punto-fiesta/message-templates`;

export async function getPFMessageTemplates(): Promise<PFMessageTemplate[]> {
  const res = await fetchWithAuth(BASE);
  return (await res.json()).data;
}

export async function updatePFMessageTemplate(
  key: string,
  body: string
): Promise<PFMessageTemplate> {
  const res = await fetchWithAuth(`${BASE}/${key}`, {
    method: "PUT",
    body: JSON.stringify({ body }),
  });
  return (await res.json()).data;
}
