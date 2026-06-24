'use client';
import { useEffect, useState } from 'react';
import {
    getAllBrandsAdmin,
    createBrand,
    updateBrand,
    uploadBrandImage,
    toggleBrandStatus,
    deleteBrand,
} from '@/services/brandService';
import type { ApiBrand } from '@/lib/schemas';
import { isAdmin } from '@/lib/auth';
import { MoreVertical, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Swal from 'sweetalert2';

const PAGE_SIZE = 15;

export default function AdminBrandsPage() {
    const [allBrands, setAllBrands] = useState<ApiBrand[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [image, setImage] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [userIsAdmin, setUserIsAdmin] = useState(false);

    useEffect(() => { setUserIsAdmin(isAdmin()); }, []);

    const loadAll = async (p = page) => {
        setLoading(true);
        try {
            const result = await getAllBrandsAdmin({ page: p, limit: PAGE_SIZE });
            setAllBrands(result.items);
            setTotalPages(result.totalPages);
            setTotal(result.total);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => { loadAll(page); }, [page]);

    const openCreate = () => {
        setEditingId(null);
        setName('');
        setImage('');
        setImageFile(null);
        setImagePreview('');
        setError('');
        setShowForm(true);
    };

    const openEdit = (b: ApiBrand) => {
        setEditingId(b.id);
        setName(b.brandName);
        setImage(b.brandImage ?? '');
        setImageFile(null);
        setImagePreview(b.brandImage ?? '');
        setError('');
        setShowForm(true);
    };

    const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setImageFile(file);
        if (file) {
            setImagePreview(URL.createObjectURL(file));
            setImage('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const data = { brandName: name, brandImage: imageFile ? undefined : (image || null) };
            let savedId = editingId;
            if (editingId) {
                await updateBrand(editingId, data);
            } else {
                const created = await createBrand(data);
                savedId = created.id;
            }
            if (imageFile && savedId) {
                await uploadBrandImage(savedId, imageFile);
            }
            setShowForm(false);
            loadAll(page);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (brand: ApiBrand) => {
        const active = brand.isActive !== false;
        const result = await Swal.fire({
            title: active ? '¿Pausar marca?' : '¿Activar marca?',
            text: active
                ? 'La marca quedará pausada y no aparecerá en el catálogo.'
                : 'La marca volverá a estar activa en el catálogo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4166e0',
            cancelButtonColor: '#6b7280',
            confirmButtonText: active ? 'Sí, pausar' : 'Sí, activar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await toggleBrandStatus(brand.id);
            loadAll(page);
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (brand: ApiBrand) => {
        const result = await Swal.fire({
            title: '¿Eliminar marca?',
            text: `"${brand.brandName}" se eliminará permanentemente. Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await deleteBrand(brand.id);
            const newPage = allBrands.length === 1 && page > 1 ? page - 1 : page;
            setPage(newPage);
            loadAll(newPage);
        } catch (err) { console.error(err); }
    };

    const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(page * PAGE_SIZE, total);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Marcas</h1>
                <button
                    onClick={openCreate}
                    className="bg-[#4166e0] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#3155c9] transition-colors"
                >
                    + Nueva marca
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="font-semibold text-gray-700 mb-4">{editingId ? 'Editar marca' : 'Nueva marca'}</h2>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Nombre</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Imagen</label>
                            <div className="flex gap-3 items-start">
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-2 cursor-pointer hover:border-[#4166e0] transition-colors text-sm text-gray-500">
                                        <span>📎 Subir archivo</span>
                                        <span className="text-xs text-gray-400">.jpg, .png, .webp, .gif</span>
                                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageFile} />
                                    </label>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <div className="flex-1 h-px bg-gray-200" />
                                        o pegar URL
                                        <div className="flex-1 h-px bg-gray-200" />
                                    </div>
                                    <input
                                        value={image}
                                        onChange={(e) => { setImage(e.target.value); if (e.target.value) { setImageFile(null); setImagePreview(e.target.value); } }}
                                        placeholder="https://..."
                                        disabled={!!imageFile}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0] disabled:bg-gray-50 disabled:text-gray-400"
                                    />
                                    {imageFile && (
                                        <button type="button" onClick={() => { setImageFile(null); setImagePreview(image); }} className="text-xs text-red-500 hover:underline text-left">
                                            ✕ Quitar archivo ({imageFile.name})
                                        </button>
                                    )}
                                </div>
                                {imagePreview && (
                                    <img src={imagePreview} alt="preview" className="w-20 h-20 object-contain rounded border border-gray-200 shrink-0" onError={() => setImagePreview('')} />
                                )}
                            </div>
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
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Nombre</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allBrands.map((b) => (
                                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{b.brandName}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {b.isActive !== false ? 'Activa' : 'Pausada'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                                                    <MoreVertical className="h-4 w-4 text-gray-500" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openEdit(b)}>
                                                    <Pencil className="h-4 w-4 text-[#4166e0]" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {b.isActive !== false ? (
                                                    <DropdownMenuItem className="cursor-pointer gap-2 text-yellow-600 focus:text-yellow-600" onClick={() => handleToggle(b)}>
                                                        <PowerOff className="h-4 w-4" />
                                                        Pausar
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem className="cursor-pointer gap-2 text-green-600 focus:text-green-600" onClick={() => handleToggle(b)}>
                                                        <Power className="h-4 w-4" />
                                                        Activar
                                                    </DropdownMenuItem>
                                                )}
                                                {userIsAdmin && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="cursor-pointer gap-2 text-red-500 focus:text-red-500" onClick={() => handleDelete(b)}>
                                                            <Trash2 className="h-4 w-4" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {allBrands.length === 0 && <p className="text-center py-8 text-gray-400">No hay marcas.</p>}

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex flex-col items-center gap-2 px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage((p) => p - 1)}
                                    disabled={page === 1}
                                    className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    ‹
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                                    .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                                        if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                                        acc.push(n);
                                        return acc;
                                    }, [])
                                    .map((n, i) =>
                                        n === '...' ? (
                                            <span key={`ellipsis-${i}`} className="px-2">…</span>
                                        ) : (
                                            <button
                                                key={n}
                                                onClick={() => setPage(n as number)}
                                                className={`px-3 py-1 rounded border text-sm ${page === n ? 'bg-[#4166e0] text-white border-[#4166e0]' : 'border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                {n}
                                            </button>
                                        )
                                    )}
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page === totalPages}
                                    className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    ›
                                </button>
                            </div>
                            <span>{total === 0 ? '0 resultados' : `${startItem}–${endItem} de ${total}`}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
