import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { ApiBanner } from '@/lib/schemas';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

export async function getActiveBanners(): Promise<ApiBanner[]> {
    const res = await fetch(`${BASE}/banners`);
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
}

export async function getAllBannersAdmin(): Promise<ApiBanner[]> {
    const res = await fetchWithAuth(`${BASE}/banners/admin`);
    return (await res.json()).data;
}

export async function uploadBanner(file: File, title?: string): Promise<ApiBanner> {
    const fd = new FormData();
    fd.append('file', file);
    if (title) fd.append('title', title);
    const res = await fetchWithAuth(`${BASE}/banners`, { method: 'POST', body: fd });
    return (await res.json()).data;
}

export async function updateBanner(id: string, data: { title?: string | null; isActive?: boolean; displayOrder?: number }): Promise<ApiBanner> {
    const res = await fetchWithAuth(`${BASE}/banners/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
}

export async function deleteBanner(id: string): Promise<void> {
    await fetchWithAuth(`${BASE}/banners/${id}`, { method: 'DELETE' });
}
