import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { PFAnnouncement } from '@/lib/schemas';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/punto-fiesta/announcements`;

export async function getAllPFAnnouncements(): Promise<PFAnnouncement[]> {
    const res = await fetchWithAuth(BASE);
    return (await res.json()).data;
}

export async function createPFAnnouncement(
    file: File,
    type: 'POPUP' | 'CAROUSEL',
    title?: string,
    displayOrder?: number,
): Promise<PFAnnouncement> {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('type', type);
    if (title) fd.append('title', title);
    if (displayOrder !== undefined) fd.append('displayOrder', String(displayOrder));
    const res = await fetchWithAuth(BASE, { method: 'POST', body: fd });
    return (await res.json()).data;
}

export async function updatePFAnnouncement(
    id: string,
    data: { title?: string | null; isActive?: boolean; displayOrder?: number },
): Promise<PFAnnouncement> {
    const res = await fetchWithAuth(`${BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
}

export async function replacePFAnnouncementImage(id: string, file: File): Promise<PFAnnouncement> {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetchWithAuth(`${BASE}/${id}/image`, { method: 'PATCH', body: fd });
    return (await res.json()).data;
}

export async function deletePFAnnouncement(id: string): Promise<void> {
    await fetchWithAuth(`${BASE}/${id}`, { method: 'DELETE' });
}
