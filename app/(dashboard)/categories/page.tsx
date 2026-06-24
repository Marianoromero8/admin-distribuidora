'use client';
import React, { useEffect, useState } from 'react';
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} from '@/services/categoryService';
import type { ApiCategory } from '@/lib/schemas';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Swal from 'sweetalert2';

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<ApiCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const loadAll = async () => {
        setLoading(true);
        try {
            setCategories(await getCategories());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, []);

    const rootCategories = categories.filter((c) => c.parentCategoryId === null);
    const subcategories = categories.filter((c) => c.parentCategoryId !== null);

    const openCreate = () => {
        setEditingId(null);
        setName('');
        setParentId('');
        setError('');
        setShowForm(true);
    };

    const openEdit = (c: ApiCategory) => {
        setEditingId(c.id);
        setName(c.categoryName);
        setParentId(c.parentCategoryId ?? '');
        setError('');
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const data = { categoryName: name, parentCategoryId: parentId || null };
            if (editingId) {
                await updateCategory(editingId, data);
            } else {
                await createCategory(data);
            }
            setShowForm(false);
            await loadAll();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, isRoot: boolean) => {
        const result = await Swal.fire({
            title: '¿Eliminar categoría?',
            text: isRoot
                ? 'Se eliminarán también todas sus subcategorías. Esta acción no se puede deshacer.'
                : 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await deleteCategory(id);
            await loadAll();
        } catch (err: unknown) {
            Swal.fire({
                title: 'Error',
                text: err instanceof Error ? err.message : 'Error al eliminar',
                icon: 'error',
                confirmButtonColor: '#4166e0',
            });
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Categorías</h1>
                <button
                    onClick={openCreate}
                    className="bg-[#4166e0] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#3155c9] transition-colors"
                >
                    + Nueva categoría
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="font-semibold text-gray-700 mb-4">{editingId ? 'Editar categoría' : 'Nueva categoría'}</h2>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Nombre</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Categoría padre (opcional)</label>
                            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]">
                                <option value="">Ninguna (categoría raíz)</option>
                                {rootCategories.map((c) => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                            </select>
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div className="flex gap-3">
                            <button type="submit" disabled={saving} className="bg-[#4166e0] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#3155c9] disabled:opacity-50">
                                {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 px-4 py-2 rounded text-sm text-gray-600 hover:bg-gray-50">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <p className="text-gray-500">Cargando...</p>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Categoría</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Tipo</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rootCategories.map((cat) => (
                                <React.Fragment key={cat.id}>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <td className="px-4 py-3 font-semibold text-gray-700">{cat.categoryName}</td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">Raíz</td>
                                        <td className="px-4 py-3">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-1 rounded hover:bg-gray-200 transition-colors">
                                                        <MoreVertical className="h-4 w-4 text-gray-500" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="cursor-pointer gap-2"
                                                        onClick={() => openEdit(cat)}
                                                    >
                                                        <Pencil className="h-4 w-4 text-[#4166e0]" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                                                        onClick={() => handleDelete(cat.id, true)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                    {subcategories.filter((s) => s.parentCategoryId === cat.id).map((sub) => (
                                        <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3 pl-8 text-gray-600">↳ {sub.categoryName}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">Subcategoría</td>
                                            <td className="px-4 py-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                                                            <MoreVertical className="h-4 w-4 text-gray-500" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            className="cursor-pointer gap-2"
                                                            onClick={() => openEdit(sub)}
                                                        >
                                                            <Pencil className="h-4 w-4 text-[#4166e0]" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                                                            onClick={() => handleDelete(sub.id, false)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    {categories.length === 0 && <p className="text-center py-8 text-gray-400">No hay categorías.</p>}
                </div>
            )}
        </div>
    );
}
