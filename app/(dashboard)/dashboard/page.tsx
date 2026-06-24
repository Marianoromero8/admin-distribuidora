'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProductsAdmin } from '@/services/productService';
import { getAllBrandsAdminUnpaginated } from '@/services/brandService';
import { getCategories } from '@/services/categoryService';
import { getAllUsers } from '@/services/userService';

const ROLE_LABELS: Record<string, string> = { ADMIN: 'Admins', EMPLOYEE: 'Empleados', CLIENT: 'Clientes' };
const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    EMPLOYEE: 'bg-blue-100 text-blue-700',
    CLIENT: 'bg-gray-100 text-gray-600',
};

interface LowStockProduct {
    id: string;
    productName: string;
    stock: number;
    brand?: { brandName: string } | null;
}

interface Stats {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    totalBrands: number;
    activeBrands: number;
    totalCategories: number;
    usersByRole: Record<string, number>;
    lowStock: LowStockProduct[];
}

export default function AdminHomePage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [allProducts, activeProducts, allProductsFull, brands, categories, users] = await Promise.all([
                    getAllProductsAdmin({ page: 1, limit: 1 }),
                    getAllProductsAdmin({ page: 1, limit: 1, available: true }),
                    getAllProductsAdmin({ page: 1, limit: 9999 }),
                    getAllBrandsAdminUnpaginated(),
                    getCategories(),
                    getAllUsers(),
                ]);

                const usersByRole: Record<string, number> = {};
                for (const u of users) {
                    usersByRole[u.role] = (usersByRole[u.role] ?? 0) + 1;
                }

                const lowStock = allProductsFull.items
                    .filter((p) => p.available !== false && (p.stock ?? 0) < 10)
                    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));

                setStats({
                    totalProducts: allProducts.total,
                    activeProducts: activeProducts.total,
                    inactiveProducts: allProducts.total - activeProducts.total,
                    totalBrands: brands.length,
                    activeBrands: brands.filter((b) => b.isActive).length,
                    totalCategories: categories.length,
                    usersByRole,
                    lowStock,
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-8">Inicio</h1>

            {/* Main stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Productos"
                    loading={loading}
                    value={stats?.totalProducts}
                    sub={stats ? `${stats.activeProducts} activos · ${stats.inactiveProducts} pausados` : undefined}
                    accent="#4166e0"
                />
                <StatCard
                    title="Marcas"
                    loading={loading}
                    value={stats?.totalBrands}
                    sub={stats ? `${stats.activeBrands} activas · ${stats.totalBrands - stats.activeBrands} pausadas` : undefined}
                    accent="#4166e0"
                />
                <StatCard
                    title="Categorías"
                    loading={loading}
                    value={stats?.totalCategories}
                    accent="#4166e0"
                />
                <StatCard
                    title="Usuarios"
                    loading={loading}
                    value={stats ? Object.values(stats.usersByRole).reduce((a, b) => a + b, 0) : undefined}
                    accent="#4166e0"
                />
            </div>

            {/* Users breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Usuarios por rol</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(['ADMIN', 'EMPLOYEE', 'CLIENT'] as const).map((role) => {
                                    const count = stats?.usersByRole[role] ?? 0;
                                    const total = stats ? Object.values(stats.usersByRole).reduce((a, b) => a + b, 0) : 1;
                                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                    return (
                                        <div key={role}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}>
                                                    {ROLE_LABELS[role]}
                                                </span>
                                                <span className="text-sm font-semibold text-gray-700">{count}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                <div
                                                    className="h-1.5 rounded-full bg-[#4166e0] transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Estado del catálogo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[
                                    { label: 'Productos activos', value: stats?.activeProducts ?? 0, total: stats?.totalProducts ?? 1, color: 'bg-green-500' },
                                    { label: 'Productos pausados', value: stats?.inactiveProducts ?? 0, total: stats?.totalProducts ?? 1, color: 'bg-red-400' },
                                    { label: 'Marcas activas', value: stats?.activeBrands ?? 0, total: stats?.totalBrands ?? 1, color: 'bg-[#4166e0]' },
                                ].map((item) => {
                                    const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
                                    return (
                                        <div key={item.label}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs text-gray-600">{item.label}</span>
                                                <span className="text-sm font-semibold text-gray-700">{item.value} <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full ${item.color} transition-all duration-500`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Low stock table */}
            <Card className="border-gray-200 mt-4">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Stock bajo{!loading && stats && ` (${stats.lowStock.length})`}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-2">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                        </div>
                    ) : stats?.lowStock.length === 0 ? (
                        <p className="text-sm text-gray-400 px-6 pb-4">Todos los productos activos tienen stock suficiente.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-y border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Producto</th>
                                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Marca</th>
                                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.lowStock.map((p) => (
                                    <tr key={p.id} className="border-b border-gray-100 last:border-0">
                                        <td className="px-4 py-2 text-gray-700">{p.productName}</td>
                                        <td className="px-4 py-2 text-gray-400">{p.brand?.brandName ?? '-'}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                (p.stock ?? 0) === 0
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-orange-100 text-orange-600'
                                            }`}>
                                                {p.stock ?? 0}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({ title, value, sub, loading, accent }: {
    title: string;
    value?: number;
    sub?: string;
    loading: boolean;
    accent: string;
}) {
    return (
        <Card className="border-gray-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-8 w-16" />
                ) : (
                    <>
                        <p className="text-3xl font-bold" style={{ color: accent }}>{value ?? 0}</p>
                        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
