export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT';
}

const TOKEN_KEY = 'ssg_token';
const USER_KEY = 'ssg_user';
const LAST_ACTIVITY_KEY = 'ssg_last_activity';
const SESSION_EXPIRY_DAYS = 30;

export function saveAuth(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

export function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function isSessionExpired(): boolean {
    if (typeof window === 'undefined') return false;
    const last = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!last) return true;
    const elapsed = Date.now() - parseInt(last, 10);
    return elapsed > SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}

export function updateLastActivity() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function canManage(): boolean {
    const user = getUser();
    return user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';
}

export function isAdmin(): boolean {
    const user = getUser();
    return user?.role === 'ADMIN';
}
