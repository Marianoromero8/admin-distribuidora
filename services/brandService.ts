import { BrandsApiResponseSchema, BrandsPaginatedApiResponseSchema, ApiBrand, PaginatedBrands } from '@/lib/schemas';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

export async function getBrands(): Promise<ApiBrand[]> {
    const res = await fetch(`${BASE}/brands`);
    if (!res.ok) throw new Error('Error fetching brands');
    const json = await res.json();
    return BrandsApiResponseSchema.parse(json).data;
}

export async function getAllBrandsAdmin(params: { page?: number; limit?: number } = {}): Promise<PaginatedBrands> {
    const query = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 15) });
    const res = await fetchWithAuth(`${BASE}/brands/admin?${query}`);
    const json = await res.json();
    return BrandsPaginatedApiResponseSchema.parse(json).data;
}

export async function getAllBrandsAdminUnpaginated(): Promise<ApiBrand[]> {
    const res = await fetchWithAuth(`${BASE}/brands/admin/all`);
    const json = await res.json();
    return BrandsApiResponseSchema.parse(json).data;
}

export async function deleteBrand(id: string): Promise<void> {
    await fetchWithAuth(`${BASE}/brands/${id}`, { method: 'DELETE' });
}

export async function createBrand(data: { brandName: string; brandImage?: string | null }): Promise<ApiBrand> {
    const res = await fetchWithAuth(`${BASE}/brands`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
}

export async function updateBrand(id: string, data: { brandName?: string; brandImage?: string | null }): Promise<ApiBrand> {
    const res = await fetchWithAuth(`${BASE}/brands/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
}

export async function uploadBrandImage(id: string, file: File): Promise<ApiBrand> {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetchWithAuth(`${BASE}/brands/${id}/image`, {
        method: 'PATCH',
        body: fd,
    });
    return (await res.json()).data;
}

export async function toggleBrandStatus(id: string): Promise<ApiBrand> {
    const res = await fetchWithAuth(`${BASE}/brands/${id}/status`, { method: 'PATCH' });
    const json = await res.json();
    return json.data;
}
