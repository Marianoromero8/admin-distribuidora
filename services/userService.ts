import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { ApiUser, ApiSchedule } from '@/lib/schemas';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

export async function getAllUsers(): Promise<ApiUser[]> {
    const res = await fetchWithAuth(`${BASE}/users`);
    return (await res.json()).data;
}

export async function createEmployee(data: {
    name: string;
    lastname: string;
    email: string;
    password: string;
    phone?: string | null;
    documentType?: string | null;
    documentNumber?: string | null;
}): Promise<ApiUser> {
    const res = await fetchWithAuth(`${BASE}/users`, {
        method: 'POST',
        body: JSON.stringify({ ...data, role: 'EMPLOYEE' }),
    });
    return (await res.json()).data;
}

export async function toggleUserStatus(id: string, isActive: boolean): Promise<void> {
    await fetchWithAuth(`${BASE}/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
    });
}

export async function updateUserData(id: string, data: {
    name?: string;
    lastname?: string;
    email?: string;
    phone?: string | null;
    documentType?: string | null;
    documentNumber?: string | null;
}): Promise<void> {
    await fetchWithAuth(`${BASE}/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export async function updateUserRole(id: string, role: string): Promise<void> {
    await fetchWithAuth(`${BASE}/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
    });
}

export async function deleteUser(id: string): Promise<void> {
    await fetchWithAuth(`${BASE}/users/${id}`, { method: 'DELETE' });
}

export async function getUserSchedule(userId: string): Promise<ApiSchedule[]> {
    const res = await fetchWithAuth(`${BASE}/users/${userId}/schedule`);
    return (await res.json()).data;
}

export async function addUserSchedule(userId: string, data: { zoneId: string; dayOfWeek: string }): Promise<ApiSchedule> {
    const res = await fetchWithAuth(`${BASE}/users/${userId}/schedule`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return (await res.json()).data;
}

export async function removeUserSchedule(userId: string, scheduleId: string): Promise<void> {
    await fetchWithAuth(`${BASE}/users/${userId}/schedule/${scheduleId}`, { method: 'DELETE' });
}
