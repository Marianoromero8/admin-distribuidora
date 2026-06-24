'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth, isSessionExpired, updateLastActivity } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [checked, setChecked] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

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
        { href: '/punto-fiesta', label: 'Punto Fiesta', roles: ['ADMIN', 'EMPLOYEE'] },
    ].filter((item) => !userRole || item.roles.includes(userRole));

    const isPF = pathname.startsWith('/punto-fiesta');
    const pfTab = searchParams.get('tab') ?? 'summary';

    const pfNavItems = [
        { key: 'summary', label: 'Inicio' },
        { key: 'orders', label: 'Pedidos' },
        { key: 'products', label: 'Productos' },
        { key: 'categories', label: 'Categorías' },
        { key: 'ads', label: 'Anuncios' },
    ];

    if (isPF) {
        return (
            <div className="min-h-screen flex bg-gray-50">
                <aside className="w-56 bg-[#044389] flex flex-col py-8 px-5 gap-1 shrink-0">
                    <h2 className="font-bold text-[#FCFF4B] text-base tracking-tight mb-1 uppercase leading-tight">
                        Punto<br /><span className="text-white">Fiesta</span>
                    </h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-6">Dashboard</p>
                    <div className="w-6 h-px bg-[#FCFF4B]/30 mb-6" />
                    {pfNavItems.map((item) => (
                        <Link
                            key={item.key}
                            href={`/punto-fiesta?tab=${item.key}`}
                            className={`px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] font-medium transition-colors border-l-2 pl-2.5 ${
                                pfTab === item.key
                                    ? 'text-[#FCFF4B] border-[#FCFF4B]'
                                    : 'text-white/50 border-transparent hover:text-white/80'
                            }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                    <Link
                        href="/"
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
                <main className="flex-1 p-10 overflow-auto">{children}</main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-[#f5f2eb]">
            <aside className="w-56 bg-[#0f1628] flex flex-col py-8 px-5 gap-1 shrink-0">
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
            <main className="flex-1 p-10 overflow-auto">{children}</main>
        </div>
    );
}
