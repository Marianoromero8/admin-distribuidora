"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  getPFProducts,
  createPFProduct,
  updatePFProduct,
  uploadPFProductImage,
  deletePFProduct,
} from "@/services/pfProductService";
import { getPFCategories } from "@/services/pfCategoryService";
import type { PFProduct, PFCategory } from "@/lib/schemas";
import { Plus, Pencil, Trash2, ImageIcon } from "lucide-react";
import Swal from "sweetalert2";
import { fmtMoney } from "./_shared";

// ─── Tab: Products ────────────────────────────────────────────────────────────

export function ProductsTab() {
  const [products, setProducts] = useState<PFProduct[]>([]);
  const [categories, setCategories] = useState<PFCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PFProduct | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockValue, setEditingStockValue] = useState("");
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form state
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    price: "",
    categoryId: "",
    stock: "0",
    featured: false,
  });

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.code?.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    );
  }, [products, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([getPFProducts({ all: true }), getPFCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm({
      code: "",
      name: "",
      description: "",
      price: "",
      categoryId: categories[0]?.id ?? "",
      stock: "0",
      featured: false,
    });
    setShowModal(true);
  };

  const openEdit = (p: PFProduct) => {
    setEditingProduct(p);
    setForm({
      code: p.code ?? "",
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      categoryId: p.categoryId,
      stock: String(p.stock),
      featured: p.featured,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.categoryId) return;
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim() || undefined,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        categoryId: form.categoryId,
        stock: parseInt(form.stock) || 0,
        featured: form.featured,
      };
      if (editingProduct) {
        await updatePFProduct(editingProduct.id, payload);
      } else {
        await createPFProduct(payload);
      }
      setShowModal(false);
      load();
    } catch (e) {
      Swal.fire("Error", e instanceof Error ? e.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const savePriceEdit = async (id: string) => {
    const price = parseFloat(editingPriceValue);
    setEditingPriceId(null);
    if (isNaN(price) || price <= 0) return;
    try {
      await updatePFProduct(id, { price });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, price } : p)));
    } catch (e) {
      Swal.fire("Error", e instanceof Error ? e.message : "Error al guardar precio", "error");
    }
  };

  const saveStockEdit = async (id: string) => {
    const stock = parseInt(editingStockValue);
    setEditingStockId(null);
    if (isNaN(stock) || stock < 0) return;
    try {
      await updatePFProduct(id, { stock });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock } : p)));
    } catch (e) {
      Swal.fire("Error", e instanceof Error ? e.message : "Error al guardar stock", "error");
    }
  };

  const handleToggleActive = async (p: PFProduct) => {
    try {
      await updatePFProduct(p.id, { active: !p.active });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      Swal.fire("Error", e instanceof Error ? e.message : "No se pudo actualizar", "error");
    }
  };

  const handleToggleFeatured = async (p: PFProduct) => {
    try {
      await updatePFProduct(p.id, { featured: !p.featured });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, featured: !x.featured } : x)));
    } catch (e) {
      Swal.fire("Error", e instanceof Error ? e.message : "No se pudo actualizar", "error");
    }
  };

  const handleImageUpload = async (productId: string, file: File) => {
    setUploadingImageId(productId);
    try {
      const updated = await uploadPFProductImage(productId, file);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, imageUrl: updated.imageUrl } : p))
      );
    } catch (e) {
      Swal.fire("Error", e instanceof Error ? e.message : "Error al subir imagen", "error");
    } finally {
      setUploadingImageId(null);
    }
  };

  const handleDelete = async (p: PFProduct) => {
    const result = await Swal.fire({
      title: "¿Eliminar producto?",
      text: `"${p.name}" se eliminará permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    try {
      await deletePFProduct(p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      Swal.fire("Error", e instanceof Error ? e.message : "No se pudo eliminar", "error");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-3">
        <p className="text-sm text-gray-500 whitespace-nowrap">
          {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código o nombre..."
          className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#4166e0]"
        />
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4166e0] text-white text-sm rounded font-medium hover:bg-[#3456c8] transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo producto
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Código</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Producto</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Categoría</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Precio</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Stock</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Destacado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 font-mono">{p.code ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 shrink-0">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-9 h-9 object-contain rounded border border-gray-100"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                        <button
                          onClick={() => {
                            imageInputRef.current?.click();
                            imageInputRef.current?.setAttribute("data-id", p.id);
                          }}
                          disabled={uploadingImageId === p.id}
                          title="Cambiar imagen"
                          className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-full p-0.5 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          <Pencil className="h-2.5 w-2.5 text-gray-500" />
                        </button>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-gray-400 truncate max-w-[180px]">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-500">{p.category?.name ?? "—"}</td>

                  <td className="px-4 py-3">
                    {editingPriceId === p.id ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        autoFocus
                        value={editingPriceValue}
                        onChange={(e) => setEditingPriceValue(e.target.value)}
                        onBlur={() => savePriceEdit(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") savePriceEdit(p.id);
                          if (e.key === "Escape") setEditingPriceId(null);
                        }}
                        className="w-24 border border-[#4166e0] rounded px-2 py-0.5 text-sm focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() => {
                          setEditingPriceId(p.id);
                          setEditingPriceValue(String(p.price));
                        }}
                        className="cursor-pointer font-medium text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                        title="Click para editar precio"
                      >
                        {fmtMoney(Number(p.price))}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingStockId === p.id ? (
                      <input
                        type="number"
                        min="0"
                        autoFocus
                        value={editingStockValue}
                        onChange={(e) => setEditingStockValue(e.target.value)}
                        onBlur={() => saveStockEdit(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveStockEdit(p.id);
                          if (e.key === "Escape") setEditingStockId(null);
                        }}
                        className="w-16 border border-[#4166e0] rounded px-2 py-0.5 text-sm focus:outline-none text-center"
                      />
                    ) : (
                      <span
                        onClick={() => {
                          setEditingStockId(p.id);
                          setEditingStockValue(String(p.stock));
                        }}
                        className={`cursor-pointer font-medium px-2 py-0.5 rounded hover:bg-gray-100 transition-colors ${p.stock === 0 ? "text-red-500" : p.stock < 10 ? "text-orange-500" : "text-gray-700"}`}
                        title="Click para editar stock"
                      >
                        {p.stock}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(p)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${p.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}
                    >
                      {p.active ? "Activo" : "Inactivo"}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleFeatured(p)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${p.featured ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
                      {p.featured ? "⭐ Sí" : "— No"}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        title="Editar"
                        className="p-1 text-gray-400 hover:text-[#4166e0] transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        title="Eliminar"
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {filteredProducts.length === 0 && (
            <p className="text-center py-10 text-gray-400">
              {products.length === 0
                ? "No hay productos. Creá el primero con el botón de arriba."
                : "Ningún producto coincide con la búsqueda."}
            </p>
          )}
        </div>
      )}

      {/* Hidden image input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const id = imageInputRef.current?.getAttribute("data-id");
          if (file && id) handleImageUpload(id, file);
          e.target.value = "";
        }}
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editingProduct ? "Editar producto" : "Nuevo producto"}
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Código</label>
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.replace(/\D/g, "").slice(0, 4) })
                  }
                  className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0] font-mono"
                  placeholder={editingProduct ? "" : "Auto"}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]"
                  placeholder="Combo Panchos x12"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0] resize-none"
                  placeholder="Descripción opcional..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Precio *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Categoría *</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]"
                >
                  <option value="">Seleccioná una categoría</option>
                  {categories
                    .filter((c) => c.active)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#4166e0] focus:ring-[#4166e0]"
                />
                Destacado (aparece en &quot;Los más pedidos&quot;)
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-[#4166e0] text-white rounded-lg font-medium hover:bg-[#3456c8] disabled:opacity-50 transition-colors"
              >
                {saving ? "Guardando..." : editingProduct ? "Guardar cambios" : "Crear producto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
