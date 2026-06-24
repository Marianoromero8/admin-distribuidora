import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  PFOrdersApiResponseSchema,
  PFOrderSchema,
  PFOrder,
  PaginatedPFOrders,
} from "@/lib/schemas";

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/punto-fiesta`;

export async function getPFOrders(
  params: {
    page?: number;
    limit?: number;
    status?: "PENDING" | "ACCEPTED" | "DECLINED" | "PAID";
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<PaginatedPFOrders> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 15),
  });
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  const res = await fetchWithAuth(`${BASE}/orders?${query}`);
  const json = await res.json();
  return PFOrdersApiResponseSchema.parse(json).data;
}

export async function getPFOrderById(id: string): Promise<PFOrder> {
  const res = await fetchWithAuth(`${BASE}/orders/${id}`);
  const json = await res.json();
  return PFOrderSchema.parse(json.data);
}

export async function getPFOrderStats(
  period: "day" | "week" | "month" | "year"
): Promise<{
  paidTotal: number;
  acceptedTotal: number;
  periodPaidCount: number;
  periodPaidAmount: number;
  periodAcceptedCount: number;
  periodAcceptedAmount: number;
}> {
  const res = await fetchWithAuth(`${BASE}/orders/stats?period=${period}`);
  return (await res.json()).data;
}

export async function updatePFOrderStatus(
  id: string,
  data: {
    status: "ACCEPTED" | "DECLINED" | "PAID";
    note?: string;
    confirmedItemIds?: string[];
  }
): Promise<{ order: PFOrder; whatsappSent: boolean; whatsappRequired: boolean }> {
  const res = await fetchWithAuth(`${BASE}/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return {
    order: PFOrderSchema.parse(json.data),
    whatsappSent: json.whatsappSent ?? false,
    whatsappRequired: json.whatsappRequired ?? false,
  };
}
