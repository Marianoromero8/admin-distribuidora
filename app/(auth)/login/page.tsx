'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/services/authService';
import { getUser } from '@/lib/auth';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const user = getUser();
        if (user?.role === 'ADMIN' || user?.role === 'EMPLOYEE') {
            router.replace('/dashboard');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(email, password);
            if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') {
                setError('No tenés permisos para acceder al panel.');
                return;
            }
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Panel izquierdo */}
            <div className="hidden md:flex w-1/2 bg-[#0f1628] flex-col justify-between p-14">
                <div>
                    <h2 className="font-syne text-white font-bold text-xl uppercase tracking-tight">
                        SSG<br /><span className="text-[#4166e0]">Admin</span>
                    </h2>
                    <div className="w-6 h-px bg-[#4166e0] mt-4" />
                </div>
                <p className="text-white/20 text-xs uppercase tracking-[0.2em]">Panel de administración</p>
            </div>

            {/* Panel derecho */}
            <div className="flex-1 flex items-center justify-center bg-[#f5f2eb] px-8">
                <div className="w-full max-w-sm">
                    <h1 className="font-syne text-3xl font-bold text-[#4166e0] mb-2">Ingresar</h1>
                    <div className="w-8 h-px bg-[#4166e0] mb-8" />
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div>
                            <label className="block text-[11px] uppercase tracking-[0.15em] text-[#4166e0]/60 mb-2 font-medium">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full border-b border-[#4166e0]/30 bg-transparent px-0 py-2 text-sm text-[#4166e0] focus:outline-none focus:border-[#4166e0] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] uppercase tracking-[0.15em] text-[#4166e0]/60 mb-2 font-medium">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full border-b border-[#4166e0]/30 bg-transparent px-0 py-2 text-sm text-[#4166e0] focus:outline-none focus:border-[#4166e0] transition-colors"
                            />
                        </div>
                        {error && <p className="text-red-500 text-xs uppercase tracking-wider">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 text-[11px] uppercase tracking-[0.15em] bg-[#4166e0] text-white py-3 font-medium hover:bg-[#3155c9] transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
