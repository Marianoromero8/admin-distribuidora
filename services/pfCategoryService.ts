import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { PFCategoriesApiResponseSchema, PFCategorySchema, PFCategory } from '@/lib/schemas';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/punto-fiesta`;

export async function getPFCategories(): Promise<PFCategory[]> {
    const res = await fetchWithAuth(`${BASE}/categories`);
    const json = await res.json();
    return PFCategoriesApiResponseSchema.parse(json).data;
}

export async function createPFCategory(data: { name: string; slug: string }): Promise<PFCategory> {
    const res = await fetchWithAuth(`${BASE}/categories`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    const json = await res.json();
    return PFCategorySchema.parse(json.data);
}

export async function updatePFCategory(id: string, data: { name?: string; slug?: string; active?: boolean }): Promise<PFCategory> {
    const res = await fetchWithAuth(`${BASE}/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
    const json = await res.json();
    return PFCategorySchema.parse(json.data);
}

export async function deletePFCategory(id: string): Promise<void> {
    await fetchWithAuth(`${BASE}/categories/${id}`, { method: 'DELETE' });
}
