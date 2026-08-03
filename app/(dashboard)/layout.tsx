'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { getUser, clearAuth, isSessionExpired, updateLastActivity } from '@/lib/auth';

const ADMIN_ONLY_PATHS = ['/categories', '/brands', '/usuarios', '/anuncios', '/punto-fiesta'];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [checked, setChecked] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        setDrawerOpen(false);
    }, [pathname, searchParams]);

    useEffect(() => {
        const user = getUser();
        if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
            router.replace('/login');
            return;
        }
        if (isSessionExpired()) {
            clearAuth();
            router.replace('/login');
            return;
        }
        if (user.role !== 'ADMIN' && ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
            // Bloquea el mount de la página ADMIN-only antes de que dispare sus
            // propios fetches (si no, un EMPLOYEE que entra por URL directa ve
            // un borbotón de 403 mientras el hook de la página redirige).
            router.replace('/dashboard');
            return;
        }
        updateLastActivity();
        setUserRole(user.role);
        setChecked(true);
    }, [router, pathname]);

    if (!checked) return null;

    const handleLogout = () => {
        clearAuth();
        router.push('/login');
    };

    const navItems = [
        { href: '/dashboard', label: 'Inicio', roles: ['ADMIN', 'EMPLOYEE'], exact: true },
        { href: '/products', label: 'Productos', roles: ['ADMIN', 'EMPLOYEE'] },
        { href: '/categories', label: 'Categorías', roles: ['ADMIN'] },
        { href: '/brands', label: 'Marcas', roles: ['ADMIN'] },
        { href: '/usuarios', label: 'Usuarios', roles: ['ADMIN'] },
        { href: '/anuncios', label: 'Anuncios', roles: ['ADMIN'] },
        { href: '/punto-fiesta', label: 'Punto Fiesta', roles: ['ADMIN'] },
        { href: '/perfil', label: 'Perfil', roles: ['ADMIN', 'EMPLOYEE'] },
    ].filter((item) => !userRole || item.roles.includes(userRole));

    const isPF = pathname.startsWith('/punto-fiesta');
    const pfTab = searchParams.get('tab') ?? 'summary';

    const pfNavItems = [
        { key: 'summary', label: 'Inicio' },
        { key: 'orders', label: 'Pedidos' },
        { key: 'products', label: 'Productos' },
        { key: 'categories', label: 'Categorías' },
        { key: 'clients', label: 'Clientes' },
        { key: 'ads', label: 'Anuncios' },
    ];

    if (isPF) {
        return (
            <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
                <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-black shrink-0">
                    <button onClick={() => setDrawerOpen(true)} aria-label="Abrir menú">
                        <Menu className="h-6 w-6 text-white" />
                    </button>
                    <h2 className="font-bold text-[#FFC800] text-sm tracking-tight uppercase">
                        Punto <span className="text-white">Fiesta</span>
                    </h2>
                    <div className="w-6" />
                </header>
                {drawerOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                        onClick={() => setDrawerOpen(false)}
                    />
                )}
                <aside
                    className={`fixed inset-y-0 left-0 z-40 w-64 bg-black flex flex-col py-8 px-5 gap-1 shrink-0 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:w-56 ${
                        drawerOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <button
                        onClick={() => setDrawerOpen(false)}
                        className="lg:hidden absolute top-4 right-4 text-white/60 hover:text-white"
                        aria-label="Cerrar menú"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <h2 className="font-bold text-[#FFC800] text-base tracking-tight mb-1 uppercase leading-tight">
                        Punto<br /><span className="text-white">Fiesta</span>
                    </h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-6">Dashboard</p>
                    <div className="w-6 h-px bg-[#FFC800]/30 mb-6" />
                    {pfNavItems.map((item) => (
                        <Link
                            key={item.key}
                            href={`/punto-fiesta?tab=${item.key}`}
                            onClick={() => setDrawerOpen(false)}
                            className={`px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] font-medium transition-colors border-l-2 pl-2.5 ${
                                pfTab === item.key
                                    ? 'text-[#FFC800] border-[#FFC800]'
                                    : 'text-white/50 border-transparent hover:text-white/80'
                            }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                    <Link
                        href="/"
                        onClick={() => setDrawerOpen(false)}
                        className="mt-2 px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] font-medium text-white/40 hover:text-white border-l-2 border-transparent pl-2.5 transition-colors"
                    >
                        ← SSG Distribuidora
                    </Link>
                    <div className="mt-6 border-t border-white/10 pt-4">
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-white/30 hover:text-red-300 transition-colors border-l-2 border-transparent pl-2.5"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </aside>
                <main className="flex-1 p-4 lg:p-10 overflow-auto">{children}</main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#f5f2eb]">
            <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-[#0f1628] shrink-0">
                <button onClick={() => setDrawerOpen(true)} aria-label="Abrir menú">
                    <Menu className="h-6 w-6 text-white" />
                </button>
                <h2 className="font-syne text-white font-bold text-sm tracking-tight uppercase">
                    SSG <span className="text-[#4166e0]">Admin</span>
                </h2>
                <div className="w-6" />
            </header>
            {drawerOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                    onClick={() => setDrawerOpen(false)}
                />
            )}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0f1628] flex flex-col py-8 px-5 gap-1 shrink-0 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 lg:w-56 ${
                    drawerOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <button
                    onClick={() => setDrawerOpen(false)}
                    className="lg:hidden absolute top-4 right-4 text-white/40 hover:text-white"
                    aria-label="Cerrar menú"
                >
                    <X className="h-5 w-5" />
                </button>
                <h2 className="font-syne text-white font-bold text-base tracking-tight mb-8 uppercase">
                    SSG<br /><span className="text-[#4166e0]">Admin</span>
                </h2>
                <div className="w-6 h-px bg-[#4166e0] mb-6" />
                {navItems.map((item) => {
                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setDrawerOpen(false)}
                            className={`px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] font-medium transition-colors ${
                                isActive
                                    ? 'text-white border-l-2 border-[#4166e0] pl-2.5'
                                    : 'text-white/40 hover:text-white/80 border-l-2 border-transparent pl-2.5'
                            }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
                <div className="mt-6 border-t border-white/10 pt-4">
                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-white/30 hover:text-red-400 transition-colors border-l-2 border-transparent pl-2.5"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </aside>
            <main className="flex-1 p-4 lg:p-10 overflow-auto">{children}</main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <AdminLayoutInner>{children}</AdminLayoutInner>
        </Suspense>
    );
}
