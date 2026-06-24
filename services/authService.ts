import { saveAuth, AuthUser } from '@/lib/auth';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

export async function login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Credenciales inválidas' }));
        throw new Error(error.message || 'Credenciales inválidas');
    }

    const json = await res.json();
    const { token, user } = json.data;
    saveAuth(token, user);
    return user;
}
