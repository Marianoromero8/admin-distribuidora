"use client";
import { useEffect, useState, useCallback } from "react";
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  replaceAnnouncementImage,
  deleteAnnouncement,
} from "@/services/announcementService";
import {
  getAllBannersAdmin,
  uploadBanner,
  updateBanner,
  deleteBanner,
} from "@/services/bannerService";
import type { ApiAnnouncement, ApiBanner } from "@/lib/schemas";
import {
  Trash2,
  Upload,
  ToggleLeft,
  ToggleRight,
  Plus,
  Video,
} from "lucide-react";
import Swal from "sweetalert2";

type Tab = "videos" | "popup";

export default function AdminAnunciosPage() {
  const [tab, setTab] = useState<Tab>("videos");

  // ── Videos ─────────────────────────────────────────────────────
  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");

  const loadBanners = useCallback(async () => {
    setBannersLoading(true);
    try {
      const all = await getAllBannersAdmin();
      setBanners(all.filter((b) => b.mediaType === "video"));
    } catch (e) {
      console.error(e);
    } finally {
      setBannersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;
    setUploadingVideo(true);
    try {
      const banner = await uploadBanner(videoFile, videoTitle || undefined);
      setBanners((prev) => [...prev, banner]);
      setVideoFile(null);
      setVideoTitle("");
    } catch (err: unknown) {
      Swal.fire(
        "Error",
        err instanceof Error ? err.message : "No se pudo subir el video",
        "error",
      );
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleToggleBanner = async (banner: ApiBanner) => {
    try {
      await updateBanner(banner.id, { isActive: !banner.isActive });
      setBanners((prev) =>
        prev.map((b) =>
          b.id === banner.id ? { ...b, isActive: !b.isActive } : b,
        ),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBanner = async (banner: ApiBanner) => {
    const result = await Swal.fire({
      title: "¿Eliminar video?",
      text: `"${banner.title ?? "Sin título"}" se eliminará permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteBanner(banner.id);
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Popup announcements ─────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const loadAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const all = await getAllAnnouncements();
      setAnnouncements(all);
    } catch (e) {
      console.error(e);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleToggleAnnouncement = async (ann: ApiAnnouncement) => {
    try {
      // Activating one deactivates all others (handled by backend)
      await updateAnnouncement(ann.id, { isActive: !ann.isActive });
      // Refresh all to reflect backend deactivation of others
      const all = await getAllAnnouncements();
      setAnnouncements(all);
    } catch (err: unknown) {
      Swal.fire(
        "Error",
        err instanceof Error ? err.message : "Error al actualizar",
        "error",
      );
    }
  };

  const handleDeleteAnnouncement = async (ann: ApiAnnouncement) => {
    const result = await Swal.fire({
      title: "¿Eliminar anuncio?",
      text: `"${ann.title ?? "Sin título"}" se eliminará permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAnnouncement(ann.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== ann.id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageFile) return;
    setCreatingAnnouncement(true);
    try {
      const ann = await createAnnouncement(
        newImageFile,
        newTitle || undefined,
        newDescription || undefined,
      );
      setAnnouncements((prev) => [ann, ...prev]);
      setShowNewForm(false);
      setNewImageFile(null);
      setNewImagePreview("");
      setNewTitle("");
      setNewDescription("");
    } catch (err: unknown) {
      Swal.fire(
        "Error",
        err instanceof Error ? err.message : "No se pudo crear el anuncio",
        "error",
      );
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const handleReplaceImage = async (id: string) => {
    if (!replaceFile) return;
    try {
      await replaceAnnouncementImage(id, replaceFile);
      const all = await getAllAnnouncements();
      setAnnouncements(all);
      setReplaceTarget(null);
      setReplaceFile(null);
    } catch (err: unknown) {
      Swal.fire(
        "Error",
        err instanceof Error ? err.message : "No se pudo reemplazar la imagen",
        "error",
      );
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Anuncios</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab("videos")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "videos"
              ? "border-[#4166e0] text-[#4166e0]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Videos del home
        </button>
        <button
          onClick={() => setTab("popup")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === "popup"
              ? "border-[#4166e0] text-[#4166e0]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Anuncio popup
        </button>
      </div>

      {/* ── Videos tab ── */}
      {tab === "videos" && (
        <div>
          {/* Upload form */}
          <form
            onSubmit={handleUploadVideo}
            className="bg-white rounded-lg border border-gray-200 p-5 mb-6"
          >
            <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Upload className="h-4 w-4" /> Subir nuevo video
            </h2>
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-gray-600 mb-1">
                  Título (opcional)
                </label>
                <input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Ej: Promo verano 2025"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-gray-600 mb-1">
                  Archivo de video (.mp4)
                </label>
                <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-2 cursor-pointer hover:border-[#4166e0] transition-colors text-sm text-gray-500">
                  <Video className="h-4 w-4" />
                  <span>
                    {videoFile ? videoFile.name : "Seleccionar video"}
                  </span>
                  <input
                    type="file"
                    accept="video/mp4"
                    className="hidden"
                    onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                    required
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={!videoFile || uploadingVideo}
                className="bg-[#4166e0] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#3155c9] disabled:opacity-50 shrink-0"
              >
                {uploadingVideo ? "Subiendo..." : "Subir video"}
              </button>
            </div>
          </form>

          {/* Video list */}
          {bannersLoading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : banners.length === 0 ? (
            <p className="text-gray-400 text-center py-12">
              No hay videos cargados.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <video
                    src={b.mediaUrl}
                    className="w-full h-40 object-cover bg-black"
                    controls={false}
                    muted
                    onMouseEnter={(e) =>
                      (e.currentTarget as HTMLVideoElement).play()
                    }
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLVideoElement).pause();
                      (e.currentTarget as HTMLVideoElement).currentTime = 0;
                    }}
                  />
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-700 text-sm">
                        {b.title ?? "Sin título"}
                      </p>
                      <p className="text-xs text-gray-400">
                        Orden: {b.displayOrder}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleBanner(b)}
                        title={b.isActive ? "Desactivar" : "Activar"}
                        className="text-gray-400 hover:text-[#4166e0] transition-colors"
                      >
                        {b.isActive ? (
                          <ToggleRight className="h-6 w-6 text-[#4166e0]" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(b)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Popup tab ── */}
      {tab === "popup" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">
              Solo un anuncio puede estar activo a la vez. El activo se mostrará
              al abrir la página.
            </p>
            <button
              onClick={() => setShowNewForm((v) => !v)}
              className="bg-[#4166e0] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#3155c9] transition-colors flex items-center gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" /> Nuevo anuncio
            </button>
          </div>

          {/* New announcement form */}
          {showNewForm && (
            <form
              onSubmit={handleCreateAnnouncement}
              className="bg-white rounded-lg border border-gray-200 p-5 mb-6"
            >
              <h2 className="font-semibold text-gray-700 mb-4">
                Nuevo anuncio popup
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm text-gray-600 mb-1">
                    Título (opcional)
                  </label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: Promo de verano"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm text-gray-600 mb-1">
                    Descripción (opcional)
                  </label>
                  <input
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Texto del anuncio"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4166e0]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">
                    Imagen del anuncio *
                  </label>
                  <div className="flex gap-3 items-start">
                    <label className="flex-1 flex items-center gap-2 border border-dashed border-gray-300 rounded px-3 py-2 cursor-pointer hover:border-[#4166e0] transition-colors text-sm text-gray-500">
                      <Upload className="h-4 w-4" />
                      <span>
                        {newImageFile
                          ? newImageFile.name
                          : "Seleccionar imagen"}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setNewImageFile(f);
                          setNewImagePreview(f ? URL.createObjectURL(f) : "");
                        }}
                        required
                      />
                    </label>
                    {newImagePreview && (
                      <img
                        src={newImagePreview}
                        alt="preview"
                        className="w-20 h-20 object-contain rounded border border-gray-200 shrink-0"
                      />
                    )}
                  </div>
                </div>
                <div className="col-span-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={!newImageFile || creatingAnnouncement}
                    className="bg-[#4166e0] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#3155c9] disabled:opacity-50"
                  >
                    {creatingAnnouncement ? "Guardando..." : "Crear anuncio"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="border border-gray-300 px-4 py-2 rounded text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Announcements list */}
          {announcementsLoading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : announcements.length === 0 ? (
            <p className="text-gray-400 text-center py-12">
              No hay anuncios creados.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`bg-white rounded-lg border overflow-hidden ${ann.isActive ? "border-[#4166e0]" : "border-gray-200"}`}
                >
                  {ann.isActive && (
                    <div className="bg-[#4166e0] text-white text-xs text-center py-1 font-medium tracking-wide">
                      ACTIVO
                    </div>
                  )}
                  <img
                    src={ann.imageUrl}
                    alt={ann.title ?? ""}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4">
                    <p className="font-medium text-gray-700 text-sm truncate">
                      {ann.title ?? "Sin título"}
                    </p>
                    {ann.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {ann.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAnnouncement(ann)}
                          title={ann.isActive ? "Desactivar" : "Activar"}
                          className="text-gray-400 hover:text-[#4166e0] transition-colors"
                        >
                          {ann.isActive ? (
                            <ToggleRight className="h-6 w-6 text-[#4166e0]" />
                          ) : (
                            <ToggleLeft className="h-6 w-6" />
                          )}
                        </button>
                        <span className="text-xs text-gray-400">
                          {ann.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Replace image */}
                        {replaceTarget === ann.id ? (
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-[#4166e0] cursor-pointer underline">
                              {replaceFile
                                ? replaceFile.name.slice(0, 12) + "..."
                                : "Elegir"}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) =>
                                  setReplaceFile(e.target.files?.[0] ?? null)
                                }
                              />
                            </label>
                            <button
                              onClick={() => handleReplaceImage(ann.id)}
                              disabled={!replaceFile}
                              className="text-xs bg-[#4166e0] text-white px-2 py-0.5 rounded disabled:opacity-50"
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
                            onClick={() => setReplaceTarget(ann.id)}
                            className="text-xs text-gray-400 hover:text-[#4166e0] transition-colors"
                            title="Cambiar imagen"
                          >
                            <Upload className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAnnouncement(ann)}
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
      )}
    </div>
  );
}
