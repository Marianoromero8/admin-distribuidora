"use client";
import { useState, useEffect, useCallback } from "react";
import {
  getAllPFAnnouncements,
  createPFAnnouncement,
  updatePFAnnouncement,
  replacePFAnnouncementImage,
  deletePFAnnouncement,
} from "@/services/pfAnnouncementService";
import type { PFAnnouncement } from "@/lib/schemas";
import { Plus, Upload, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

// ─── Tab: Ads ────────────────────────────────────────────────────────────────

export function AdsTab() {
  type AdsSubTab = "popup" | "carousel";
  const [subTab, setSubTab] = useState<AdsSubTab>("popup");
  const [items, setItems] = useState<PFAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  // New item form
  const [showForm, setShowForm] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newOrder, setNewOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  // Replace image
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getAllPFAnnouncements());
    } catch (err: unknown) {
      Swal.fire("Error", err instanceof Error ? err.message : "No se pudieron cargar los anuncios", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((i) => i.type === subTab.toUpperCase());

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile) return;
    setSaving(true);
    try {
      await createPFAnnouncement(
        newFile,
        subTab === "popup" ? "POPUP" : "CAROUSEL",
        newTitle || undefined,
        Number(newOrder) || 0,
      );
      setShowForm(false);
      setNewFile(null);
      setNewPreview("");
      setNewTitle("");
      setNewOrder("0");
      await load();
    } catch (err: unknown) {
      Swal.fire("Error", err instanceof Error ? err.message : "No se pudo crear", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: PFAnnouncement) => {
    try {
      await updatePFAnnouncement(item.id, { isActive: !item.isActive });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isActive: !i.isActive } : i)));
    } catch (err: unknown) {
      Swal.fire("Error", err instanceof Error ? err.message : "No se pudo actualizar", "error");
    }
  };

  const handleOrderChange = async (item: PFAnnouncement, value: string) => {
    const displayOrder = Number(value);
    if (isNaN(displayOrder)) return;
    try {
      await updatePFAnnouncement(item.id, { displayOrder });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, displayOrder } : i)));
    } catch (err: unknown) {
      Swal.fire("Error", err instanceof Error ? err.message : "No se pudo actualizar el orden", "error");
    }
  };

  const handleReplaceImage = async (id: string) => {
    if (!replaceFile) return;
    try {
      await replacePFAnnouncementImage(id, replaceFile);
      setReplaceTarget(null);
      setReplaceFile(null);
      await load();
    } catch (err: unknown) {
      Swal.fire("Error", err instanceof Error ? err.message : "No se pudo reemplazar la imagen", "error");
    }
  };

  const handleDelete = async (item: PFAnnouncement) => {
    const label = item.type === "POPUP" ? "slide del popup" : "imagen del carrusel";
    const result = await Swal.fire({
      title: `¿Eliminar ${label}?`,
      text: `"${item.title ?? "Sin título"}" se eliminará permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    try {
      await deletePFAnnouncement(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: unknown) {
      Swal.fire("Error", err instanceof Error ? err.message : "No se pudo eliminar", "error");
    }
  };

  const isPopup = subTab === "popup";
  const accentColor = "#000000";

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["popup", "carousel"] as AdsSubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setSubTab(t);
              setShowForm(false);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              subTab === t
                ? "border-[#DC1414] text-[#DC1414]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "popup" ? "Popup" : "Carrusel"}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          {isPopup
            ? "Las imágenes activas se muestran como slides al entrar a la home."
            : "Las imágenes activas aparecen en el carrusel de la home, ordenadas por el número de orden."}
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#262626] transition-colors flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          {isPopup ? "Nuevo slide" : "Nueva imagen"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-lg border border-gray-200 p-5 mb-6"
        >
          <h2 className="font-semibold text-gray-700 mb-4">
            {isPopup ? "Nuevo slide de popup" : "Nueva imagen de carrusel"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={isPopup ? "col-span-2 md:col-span-1" : "col-span-2 md:col-span-1"}>
              <label className="block text-sm text-gray-600 mb-1">Título (opcional)</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: Promo de verano"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm text-gray-600 mb-1">Orden</label>
              <input
                type="number"
                min="0"
                value={newOrder}
                onChange={(e) => setNewOrder(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Imagen *</label>
              <div className="flex gap-3 items-start">
                <label className="flex-1 flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-2 cursor-pointer hover:border-black transition-colors text-sm text-gray-500">
                  <Upload className="h-4 w-4" />
                  <span>{newFile ? newFile.name : "Seleccionar imagen"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setNewFile(f);
                      setNewPreview(f ? URL.createObjectURL(f) : "");
                    }}
                    required
                  />
                </label>
                {newPreview && (
                  <img
                    src={newPreview}
                    alt="preview"
                    className="w-20 h-20 object-contain rounded border border-gray-200 shrink-0"
                  />
                )}
              </div>
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={!newFile || saving}
                className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#262626] disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-gray-300 px-4 py-2 rounded text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-12">
          No hay {isPopup ? "slides" : "imágenes"} cargadas.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg border overflow-hidden ${
                  item.isActive ? "border-black" : "border-gray-200"
                }`}
              >
                {item.isActive && (
                  <div
                    className="text-white text-xs text-center py-1 font-medium tracking-wide"
                    style={{ backgroundColor: accentColor }}
                  >
                    ACTIVO
                  </div>
                )}
                <img
                  src={item.imageUrl}
                  alt={item.title ?? ""}
                  className="w-full h-36 object-contain bg-gray-50"
                />
                <div className="p-4">
                  <p className="font-medium text-gray-700 text-sm truncate">
                    {item.title ?? "Sin título"}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-400">Orden:</span>
                    <input
                      type="number"
                      min="0"
                      defaultValue={item.displayOrder}
                      onBlur={(e) => handleOrderChange(item, e.target.value)}
                      className="w-14 text-xs border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none focus:border-black"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(item)}
                        title={item.isActive ? "Desactivar" : "Activar"}
                        className="text-gray-400 hover:text-black transition-colors"
                      >
                        {item.isActive ? (
                          <ToggleRight className="h-6 w-6 text-black" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                      <span className="text-xs text-gray-400">
                        {item.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {replaceTarget === item.id ? (
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-black cursor-pointer underline">
                            {replaceFile ? replaceFile.name.slice(0, 10) + "..." : "Elegir"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
                            />
                          </label>
                          <button
                            onClick={() => handleReplaceImage(item.id)}
                            disabled={!replaceFile}
                            className="text-xs bg-black text-white px-2 py-0.5 rounded disabled:opacity-50"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => {
                              setReplaceTarget(null);
                              setReplaceFile(null);
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplaceTarget(item.id)}
                          className="text-gray-400 hover:text-black transition-colors"
                          title="Cambiar imagen"
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
