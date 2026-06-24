import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { ApiZone } from '@/lib/schemas';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

export async function getAllZones(): Promise<ApiZone[]> {
    const res = await fetchWithAuth(`${BASE}/zones`);
    return (await res.json()).data;
}

export async function createZone(zoneName: string): Promise<ApiZone> {
    const res = await fetchWithAuth(`${BASE}/zones`, {
        method: 'POST',
        body: JSON.stringify({ zoneName }),
    });
    return (await res.json()).data;
}

export async function updateZone(id: string, data: { zoneName?: string; isActive?: boolean }): Promise<ApiZone> {
    const res = await fetchWithAuth(`${BASE}/zones/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
}

export async function deleteZone(id: string): Promise<void> {
    await fetchWithAuth(`${BASE}/zones/${id}`, { method: 'DELETE' });
}
