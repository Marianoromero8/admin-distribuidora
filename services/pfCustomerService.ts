import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  PFCustomersApiResponseSchema,
  PFCustomerSchema,
  PFCustomer,
  PaginatedPFCustomers,
} from "@/lib/schemas";

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/punto-fiesta`;

export async function getPFCustomers(
  params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}
): Promise<PaginatedPFCustomers> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 15),
  });
  if (params.search) query.set("search", params.search);
  const res = await fetchWithAuth(`${BASE}/customers?${query}`);
  const json = await res.json();
  return PFCustomersApiResponseSchema.parse(json).data;
}

export async function getPFCustomerById(id: string): Promise<PFCustomer> {
  const res = await fetchWithAuth(`${BASE}/customers/${id}`);
  const json = await res.json();
  return PFCustomerSchema.parse(json.data);
}
