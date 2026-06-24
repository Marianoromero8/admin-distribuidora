import { CategoriesApiResponseSchema, ApiCategory } from '@/lib/schemas';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

export async function getCategories(): Promise<ApiCategory[]> {
    const res = await fetch(`${BASE}/categories`);
    if (!res.ok) throw new Error('Error fetching categories');
    const json = await res.json();
    return CategoriesApiResponseSchema.parse(json).data;
}

export async function getRootCategories(): Promise<ApiCategory[]> {
    const res = await fetch(`${BASE}/categories/roots`);
    if (!res.ok) throw new Error('Error fetching root categories');
    const json = await res.json();
    return CategoriesApiResponseSchema.parse(json).data;
}

export async function createCategory(data: { categoryName: string; parentCategoryId?: string | null }): Promise<ApiCategory> {
    const res = await fetchWithAuth(`${BASE}/categories`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.data;
}

export async function updateCategory(id: string, data: { categoryName?: string; parentCategoryId?: string | null }): Promise<ApiCategory> {
    const res = await fetchWithAuth(`${BASE}/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.data;
}

export async function deleteCategory(id: string): Promise<void> {
    await fetchWithAuth(`${BASE}/categories/${id}`, { method: 'DELETE' });
}
