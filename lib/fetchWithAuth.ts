import { getToken } from './auth';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = getToken();
    const isFormData = options.body instanceof FormData;

    const res = await fetch(url, {
        ...options,
        headers: {
            ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
    }

    return res;
}
