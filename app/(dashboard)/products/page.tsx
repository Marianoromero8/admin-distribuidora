'use client';
import { useEffect, useState, useCallback } from 'react';
import {
    getAllProductsAdmin,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    permanentDeleteProduct,
    formatPresentation,
} from '@/services/productService';
import { getAllBrandsAdminUnpaginated } from '@/services/brandService';
import { getCategories } from '@/services/categoryService';
import type { ApiProduct, ApiBrand, ApiCategory } from '@/lib/schemas';
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

const UNITS = ['gr', 'kg', 'ml', 'lts', 'un'] as const;
const PAGE_SIZE = 15;

const emptyForm = {
    productName: '',
    brandId: '',
    categoryId: '',
    price: '',
    contentValue: '',
    contentUnit: 'kg',
    packQuantity: '1',
    productImage: '',
    stock: '0',
    isFeatured: false,
    isPuntoFiesta: false,
};

export default function AdminProductsPage() {
    const [products, setProducts] = useState<ApiProduct[]>([]);
    const [brands, setBrands] = useState<ApiBrand[]>([]);
    const [categories, setCategories] = useState<ApiCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [filterBrand, setFilterBrand] = useState('');
    const [filterAvailable, setFilterAvailable] = useState('true');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [userIsAdmin, setUserIsAdmin] = useState(false);
    const [editingStockId, setEditingStockId] = useState<string | null>(null);
    const [editingStockValue, setEditingStockValue] = useState('');

    useEffect(() => { setUserIsAdmin(isAdmin()); }, []);

    // Load brands & categories once
    useEffect(() => {
        Promise.all([getAllBrandsAdminUnpaginated(), getCategories()])
            .then(([b, c]) => { setBrands(b); setCategories(c); })
            .catch(console.error);
    }, []);

    const loadProducts = useCallback(async (p: number, fb: string, fa: string) => {
        setLoading(true);
        try {
            const params: { page: number; limit: number; brandId?: string; available?: boolean } = { page: p, limit: PAGE_SIZE };
            if (fb) params.brandId = fb;
            if (fa !== '') params.available = fa === 'true';
            const result = await getAllProductsAdmin(params);
            setProducts(result.items);
            setTotalPages(result.totalPages);
            setTotal(result.total);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts(page, filterBrand, filterAvailable);
    }, [page, filterBrand, filterAvailable, loadProducts]);

    const handleFilterBrand = (val: string) => { setFilterBrand(val); setPage(1); };
    const handleFilterAvailable = (val: string) => { setFilterAvailable(val); setPage(1); };

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setImageFile(null);
        setImagePreview('');
        setError('');
        setShowForm(true);
    };

    const openEdit = (p: ApiProduct) => {
        setEditingId(p.id);
        setForm({
            productName: p.productName,
            brandId: p.brandId,
            categoryId: p.categoryId,
            price: String(p.price),
            contentValue: String(p.contentValue),
            contentUnit: p.contentUnit,
            packQuantity: String(p.packQuantity),
            productImage: p.productImage ?? '',
            stock: String(p.stock ?? 0),
            isFeatured: p.isFeatured ?? false,
            isPuntoFiesta: p.isPuntoFiesta ?? false,
        });
        setImageFile(null);
        setImagePreview(p.productImage ?? '');
        setError('');
        setShowForm(true);
    };

    const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setImageFile(file);
        if (file) {
            setImagePreview(URL.createObjectURL(file));
            field('productImage', '');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const payload = {
                productName: form.productName,
                brandId: form.brandId,
                categoryId: form.categoryId,
                price: parseFloat(form.price),
                contentValue: parseFloat(form.contentValue),
                contentUnit: form.contentUnit,
                packQuantity: parseInt(form.packQuantity),
                productImage: imageFile ? undefined : (form.productImage || null),
                stock: parseInt(form.stock),
                isFeatured: form.isFeatured,
                isPuntoFiesta: form.isPuntoFiesta,
            };
            let savedId = editingId;
            if (editingId) {
                await updateProduct(editingId, payload);
            } else {
                const created = await createProduct(payload);
                savedId = created.id;
            }
            if (imageFile && savedId) {
                await uploadProductImage(savedId, imageFile);
            }
            setShowForm(false);
            loadProducts(page, filterBrand, filterAvailable);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleDisable = async (id: string) => {
        const result = await Swal.fire({
            title: '¿Deshabilitar producto?',
            text: 'El producto no será visible en el catálogo.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4166e0',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, deshabilitar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await deleteProduct(id);
            loadProducts(page, filterBrand, filterAvailable);
        } catch (err) { console.error(err); }
    };

    const handleEnable = async (id: string) => {
        const result = await Swal.fire({
            title: '¿Habilitar producto?',
            text: 'El producto volverá a ser visible en el catálogo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4166e0',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, habilitar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await updateProduct(id, { available: true });
            loadProducts(page, filterBrand, filterAvailable);
        } catch (err) { console.error(err); }
    };

    const handlePermanentDelete = async (id: string, name: string) => {
        const result = await Swal.fire({
            title: '¿Eliminar producto?',
            text: `"${name}" se eliminará permanentemente. Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await permanentDeleteProduct(id);
            const newPage = products.length === 1 && page > 1 ? page - 1 : page;
            setPage(newPage);
            loadProducts(newPage, filterBrand, filterAvailable);
        } catch (err) { console.error(err); }
    };

    const field = (key: keyof typeof form, value: string | boolean) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const handleStockSave = async (id: string) => {
        const newStock = parseInt(editingStockValue);
        if (isNaN(newStock) || newStock < 0) { setEditingStockId(null); return; }
        try {
            await updateProduct(id, { stock: newStock });
            setProducts((prev) => prev.map((p) => p.id === id ? { ...p, stock: newStock } : p));
        } catch (e) { console.error(e); }
        setEditingStockId(null);
    };

    const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(page * PAGE_SIZE, total);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
                {userIsAdmin && (
                    <button
                        onClick={openCreate}
                        className="bg-[#4166e0] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#3155c9] transition-colors"
                    >
                        + Nuevo producto
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div className="flex gap-3 mb-4 flex-wrap">
                <select
                    value={filterBrand}
                    onChange={(e) => handleFilterBrand(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0] bg-white"
                >
                    <option value="">Todas las marcas</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.brandName}</option>)}
                </select>
                <select
                    value={filterAvailable}
                    onChange={(e) => handleFilterAvailable(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0] bg-white"
                >
                    <option value="">Todos los estados</option>
                    <option value="true">Activos</option>
                    <option value="false">Deshabilitados</option>
                </select>
                {(filterBrand || filterAvailable) && (
                    <button
                        onClick={() => { handleFilterBrand(''); handleFilterAvailable(''); }}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {showForm && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="font-semibold text-gray-700 mb-4">{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm text-gray-600 mb-1">Nombre</label>
                            <input value={form.productName} onChange={(e) => field('productName', e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Marca</label>
                            <select value={form.brandId} onChange={(e) => field('brandId', e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]">
                                <option value="">Seleccionar...</option>
                                {brands.map((b) => <option key={b.id} value={b.id}>{b.brandName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Categoría</label>
                            <select value={form.categoryId} onChange={(e) => field('categoryId', e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]">
                                <option value="">Seleccionar...</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.parentCategoryId ? `↳ ${c.categoryName}` : c.categoryName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Precio</label>
                            <input type="number" step="0.01" value={form.price} onChange={(e) => field('price', e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Stock</label>
                            <input type="number" value={form.stock} onChange={(e) => field('stock', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Contenido</label>
                            <input type="number" step="0.01" value={form.contentValue} onChange={(e) => field('contentValue', e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Unidad</label>
                            <select value={form.contentUnit} onChange={(e) => field('contentUnit', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]">
                                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Cantidad por pack</label>
                            <input type="number" value={form.packQuantity} onChange={(e) => field('packQuantity', e.target.value)} required className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]" />
                        </div>
                        <div className="col-span-2">
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
                                        value={form.productImage}
                                        onChange={(e) => { field('productImage', e.target.value); if (e.target.value) { setImageFile(null); setImagePreview(e.target.value); } }}
                                        placeholder="https://..."
                                        disabled={!!imageFile}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0] disabled:bg-gray-50 disabled:text-gray-400"
                                    />
                                    {imageFile && (
                                        <button type="button" onClick={() => { setImageFile(null); setImagePreview(form.productImage); }} className="text-xs text-red-500 hover:underline text-left">
                                            ✕ Quitar archivo ({imageFile.name})
                                        </button>
                                    )}
                                </div>
                                {imagePreview && (
                                    <img src={imagePreview} alt="preview" className="w-20 h-20 object-contain rounded border border-gray-200 shrink-0" onError={() => setImagePreview('')} />
                                )}
                            </div>
                        </div>
                        <div className="col-span-2 flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isFeatured" checked={form.isFeatured} onChange={(e) => field('isFeatured', e.target.checked)} className="accent-[#4166e0]" />
                                <label htmlFor="isFeatured" className="text-sm text-gray-600">Destacado</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isPuntoFiesta" checked={form.isPuntoFiesta as boolean} onChange={(e) => field('isPuntoFiesta', e.target.checked)} className="accent-[#4166e0]" />
                                <label htmlFor="isPuntoFiesta" className="text-sm text-gray-600">Punto Fiesta</label>
                            </div>
                        </div>
                        {error && <p className="col-span-2 text-red-500 text-sm">{error}</p>}
                        <div className="col-span-2 flex gap-3">
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
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Marca</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Categoría</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Presentación</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Precio</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Stock</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                                {userIsAdmin && <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p) => (
                                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{p.productName}</td>
                                    <td className="px-4 py-3 text-gray-500">{p.brand?.brandName ?? '-'}</td>
                                    <td className="px-4 py-3 text-gray-500">{p.category?.categoryName ?? '-'}</td>
                                    <td className="px-4 py-3 text-gray-500">{formatPresentation(p)}</td>
                                    <td className="px-4 py-3 text-gray-500">${p.price}</td>
                                    <td className="px-4 py-3">
                                        {editingStockId === p.id ? (
                                            <input
                                                type="number"
                                                min={0}
                                                autoFocus
                                                value={editingStockValue}
                                                onChange={(e) => setEditingStockValue(e.target.value)}
                                                onBlur={() => handleStockSave(p.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleStockSave(p.id);
                                                    if (e.key === 'Escape') setEditingStockId(null);
                                                }}
                                                className="w-16 border border-[#4166e0] rounded px-2 py-0.5 text-sm focus:outline-none text-center"
                                            />
                                        ) : (
                                            <span
                                                onClick={() => { setEditingStockId(p.id); setEditingStockValue(String(p.stock ?? 0)); }}
                                                className={`cursor-pointer font-medium px-2 py-0.5 rounded hover:bg-gray-100 transition-colors ${(p.stock ?? 0) === 0 ? 'text-red-500' : (p.stock ?? 0) < 10 ? 'text-orange-500' : 'text-gray-700'}`}
                                                title="Click para editar stock"
                                            >
                                                {p.stock ?? 0}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.available !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                            {p.available !== false ? 'Activo' : 'Deshabilitado'}
                                        </span>
                                    </td>
                                    {userIsAdmin && (
                                        <td className="px-4 py-3">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                                                        <MoreVertical className="h-4 w-4 text-gray-500" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openEdit(p)}>
                                                        <Pencil className="h-4 w-4 text-[#4166e0]" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {p.available !== false ? (
                                                        <DropdownMenuItem className="cursor-pointer gap-2 text-orange-600 focus:text-orange-600" onClick={() => handleDisable(p.id)}>
                                                            <PowerOff className="h-4 w-4" />
                                                            Deshabilitar
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem className="cursor-pointer gap-2 text-green-600 focus:text-green-600" onClick={() => handleEnable(p.id)}>
                                                            <Power className="h-4 w-4" />
                                                            Habilitar
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="cursor-pointer gap-2 text-red-500 focus:text-red-500" onClick={() => handlePermanentDelete(p.id, p.productName)}>
                                                        <Trash2 className="h-4 w-4" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {products.length === 0 && <p className="text-center py-8 text-gray-400">No hay productos.</p>}

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
