import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { ApiAnnouncement } from '@/lib/schemas';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

export async function getActiveAnnouncement(): Promise<ApiAnnouncement | null> {
    const res = await fetch(`${BASE}/announcements/active`);
    if (!res.ok) return null;
    return (await res.json()).data;
}

export async function getAllAnnouncements(): Promise<ApiAnnouncement[]> {
    const res = await fetchWithAuth(`${BASE}/announcements`);
    return (await res.json()).data;
}

export async function createAnnouncement(file: File, title?: string, description?: string): Promise<ApiAnnouncement> {
    const fd = new FormData();
    fd.append('image', file);
    if (title) fd.append('title', title);
    if (description) fd.append('description', description);
    const res = await fetchWithAuth(`${BASE}/announcements`, { method: 'POST', body: fd });
    return (await res.json()).data;
}

export async function updateAnnouncement(id: string, data: { title?: string | null; description?: string | null; isActive?: boolean }): Promise<ApiAnnouncement> {
    const res = await fetchWithAuth(`${BASE}/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
}

export async function replaceAnnouncementImage(id: string, file: File): Promise<ApiAnnouncement> {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetchWithAuth(`${BASE}/announcements/${id}/image`, { method: 'PATCH', body: fd });
    return (await res.json()).data;
}

export async function deleteAnnouncement(id: string): Promise<void> {
    await fetchWithAuth(`${BASE}/announcements/${id}`, { method: 'DELETE' });
}
