import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { PFProductsApiResponseSchema, PFProductSchema, PFProduct } from '@/lib/schemas';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/punto-fiesta`;

export async function getPFProducts(params: { all?: boolean } = {}): Promise<PFProduct[]> {
    const query = new URLSearchParams();
    if (params.all) query.set('all', 'true');
    const res = await fetchWithAuth(`${BASE}/products?${query}`);
    const json = await res.json();
    return PFProductsApiResponseSchema.parse(json).data;
}

export async function createPFProduct(data: {
    name: string;
    description?: string | null;
    price: number;
    categoryId: string;
    stock?: number;
}): Promise<PFProduct> {
    const res = await fetchWithAuth(`${BASE}/products`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    const json = await res.json();
    return PFProductSchema.parse(json.data);
}

export async function updatePFProduct(id: string, data: {
    name?: string;
    description?: string | null;
    price?: number;
    categoryId?: string;
    stock?: number;
    active?: boolean;
}): Promise<PFProduct> {
    const res = await fetchWithAuth(`${BASE}/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
    const json = await res.json();
    return PFProductSchema.parse(json.data);
}

export async function uploadPFProductImage(id: string, file: File): Promise<PFProduct> {
    const form = new FormData();
    form.append('image', file);
    const res = await fetchWithAuth(`${BASE}/products/${id}/image`, {
        method: 'POST',
        body: form,
    });
    const json = await res.json();
    return PFProductSchema.parse(json.data);
}

export async function deletePFProduct(id: string): Promise<void> {
    await fetchWithAuth(`${BASE}/products/${id}`, { method: 'DELETE' });
}
