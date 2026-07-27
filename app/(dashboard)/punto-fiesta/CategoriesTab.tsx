"use client";
import { useState, useEffect, useCallback } from "react";
import {
  getPFCategories,
  createPFCategory,
  updatePFCategory,
  deletePFCategory,
} from "@/services/pfCategoryService";
import type { PFCategory } from "@/lib/schemas";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { slugify } from "./_shared";

// ─── Tab: Categories ──────────────────────────────────────────────────────────

export function CategoriesTab() {
  const [categories, setCategories] = useState<PFCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PFCategory | null>(null);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await getPFCategories());
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
    setEditingCategory(null);
    setForm({ name: "", slug: "" });
    setShowModal(true);
  };

  const openEdit = (c: PFCategory) => {
    setEditingCategory(c);
    setForm({ name: c.name, slug: c.slug });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      if (editingCategory) {
        await updatePFCategory(editingCategory.id, {
          name: form.name.trim(),
          slug: form.slug.trim(),
        });
      } else {
        await createPFCategory({ name: form.name.trim(), slug: form.slug.trim() });
      }
      setShowModal(false);
      load();
    } catch (e) {
      Swal.fire("Error", e instanceof Error ? e.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: PFCategory) => {
    try {
      await updatePFCategory(c.id, { active: !c.active });
      setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      Swal.fire("Error", e instanceof Error ? e.message : "No se pudo actualizar", "error");
    }
  };

  const handleDelete = async (c: PFCategory) => {
    const result = await Swal.fire({
      title: "¿Eliminar categoría?",
      text: `"${c.name}" se eliminará. Si tiene productos asociados, no se va a poder eliminar hasta que los muevas a otra categoría.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    try {
      await deletePFCategory(c.id);
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) {
      Swal.fire("Error", e instanceof Error ? e.message : "No se pudo eliminar", "error");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          {categories.length} categoría{categories.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4166e0] text-white text-sm rounded font-medium hover:bg-[#3456c8] transition-colors"
        >
          <Plus className="h-4 w-4" /> Nueva categoría
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Slug</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.slug}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(c)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${c.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}
                    >
                      {c.active ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        title="Editar"
                        className="p-1 text-gray-400 hover:text-[#4166e0] transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
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
          {categories.length === 0 && (
            <p className="text-center py-10 text-gray-400">
              No hay categorías. Creá la primera con el botón de arriba.
            </p>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editingCategory ? "Editar categoría" : "Nueva categoría"}
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      name: e.target.value,
                      slug: editingCategory ? form.slug : slugify(e.target.value),
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]"
                  placeholder="Panchos"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Slug *</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#4166e0]"
                  placeholder="panchos"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Solo letras minúsculas, números y guiones.
                </p>
              </div>
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
                {saving ? "Guardando..." : editingCategory ? "Guardar cambios" : "Crear categoría"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
