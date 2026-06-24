"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getPFOrders, updatePFOrderStatus, getPFOrderStats } from "@/services/pfOrderService";
import {
  getPFProducts,
  createPFProduct,
  updatePFProduct,
  uploadPFProductImage,
  deletePFProduct,
} from "@/services/pfProductService";
import {
  getPFCategories,
  createPFCategory,
  updatePFCategory,
  deletePFCategory,
} from "@/services/pfCategoryService";
import type { PFOrder, PaginatedPFOrders, PFProduct, PFCategory } from "@/lib/schemas";
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2, ImageIcon, Search, X } from "lucide-react";
import Swal from "sweetalert2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "summary" | "orders" | "products" | "categories" | "ads";
type StatusFilter = "ALL" | "PENDING" | "ACCEPTED" | "DECLINED" | "PAID";

const PAGE_SIZE = 15;

// ─── Shared helpers ───────────────────────────────────────────────────────────

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "PENDING", label: "Pendientes" },
  { key: "ACCEPTED", label: "Aceptados" },
  { key: "PAID", label: "Cobrados" },
  { key: "DECLINED", label: "Rechazados" },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-600",
  PAID: "bg-indigo-100 text-indigo-700",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptado",
  DECLINED: "Rechazado",
  PAID: "Cobrado",
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function whatsappLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
          .reduce<(number | "...")[]>((acc, n, idx, arr) => {
            if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("...");
            acc.push(n);
            return acc;
          }, [])
          .map((n, i) =>
            n === "..." ? (
              <span key={`e-${i}`} className="px-2">
                …
              </span>
            ) : (
              <button
                key={n}
                onClick={() => onChange(n as number)}
                className={`px-3 py-1 rounded border text-sm ${page === n ? "bg-[#4166e0] text-white border-[#4166e0]" : "border-gray-300 hover:bg-gray-50"}`}
              >
                {n}
              </button>
            )
          )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>
      <span>{total === 0 ? "0 resultados" : `${start}–${end} de ${total}`}</span>
    </div>
  );
}

// ─── Tab: Orders ─────────────────────────────────────────────────────────────

function OrdersTab({
  pendingOrderId,
  onOrderHandled,
  refreshSignal,
}: {
  pendingOrderId: string | null;
  onOrderHandled: () => void;
  refreshSignal: number;
}) {
  const [orders, setOrders] = useState<PFOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [acceptModal, setAcceptModal] = useState<{
    order: PFOrder;
    confirmedIds: Set<string>;
  } | null>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, statusFilter]);

  const load = useCallback(
    async (p: number, status: StatusFilter, srch: string, from: string, to: string) => {
      setLoading(true);
      try {
        const params: Parameters<typeof getPFOrders>[0] = { page: p, limit: PAGE_SIZE };
        if (status !== "ALL") params.status = status;
        if (srch) params.search = srch;
        if (from) params.dateFrom = from;
        if (to) params.dateTo = to;
        const result: PaginatedPFOrders = await getPFOrders(params);
        setOrders(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(page, statusFilter, search, dateFrom, dateTo);
  }, [page, statusFilter, search, dateFrom, dateTo, load]);

  // Refs for refresh signal (reads latest state without re-subscribing)
  const loadRef = useRef(load);
  const pageRef = useRef(page);
  const filterRef = useRef(statusFilter);
  const searchRef = useRef(search);
  const dateFromRef = useRef(dateFrom);
  const dateToRef = useRef(dateTo);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { filterRef.current = statusFilter; }, [statusFilter]);
  useEffect(() => { searchRef.current = search; }, [search]);
  useEffect(() => { dateFromRef.current = dateFrom; }, [dateFrom]);
  useEffect(() => { dateToRef.current = dateTo; }, [dateTo]);

  useEffect(() => {
    if (refreshSignal === 0) return;
    loadRef.current(
      pageRef.current,
      filterRef.current,
      searchRef.current,
      dateFromRef.current,
      dateToRef.current
    );
  }, [refreshSignal]);

  // Navegar al pedido cuando se clickea un toast
  useEffect(() => {
    if (!pendingOrderId) return;
    setStatusFilter("PENDING");
    setPage(1);
    setExpandedId(pendingOrderId);
    onOrderHandled();
  }, [pendingOrderId, onOrderHandled]);

  const handleTabChange = (tab: StatusFilter) => {
    setStatusFilter(tab);
    setExpandedId(null);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = !!search || !!dateFrom || !!dateTo;

  const handleAccept = (order: PFOrder) => {
    const allIds = new Set((order.items ?? []).map((i) => i.id));
    setAcceptModal({ order, confirmedIds: allIds });
  };

  const toggleItem = (itemId: string) => {
    setAcceptModal((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.confirmedIds);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return { ...prev, confirmedIds: next };
    });
  };

  const confirmAccept = async () => {
    if (!acceptModal) return;
    const { order, confirmedIds } = acceptModal;
    const confirmedItems = (order.items ?? []).filter((i) => confirmedIds.has(i.id));
    if (confirmedItems.length === 0) return;
    const adjustedTotal = confirmedItems.reduce(
      (sum, i) => sum + Number(i.unitPrice) * i.quantity,
      0
    );
    const confirmedItemIds = Array.from(confirmedIds);
    setAcceptModal(null);
    setProcessing(order.id);
    try {
      const { whatsappSent, whatsappRequired } = await updatePFOrderStatus(order.id, {
        status: "ACCEPTED",
        confirmedItemIds,
      });
      if (whatsappRequired && !whatsappSent) {
        Swal.fire({
          icon: "warning",
          title: "Pedido confirmado",
          text: "El estado se actualizó pero no se pudo enviar el WhatsApp. Verificá que el número esté vinculado.",
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "Pedido confirmado",
          text: "WhatsApp enviado automáticamente al cliente.",
          timer: 2500,
          showConfirmButton: false,
        });
      }
      load(page, statusFilter, search, dateFrom, dateTo);
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Error al procesar", "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkAsPaid = async (order: PFOrder) => {
    const result = await Swal.fire({
      title: "¿Marcar como cobrado?",
      html: `<p class="text-sm text-gray-600">Confirmás que recibiste el pago de <strong>${order.clientName} ${order.clientSurname}</strong>.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, cobrado",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    setProcessing(order.id);
    try {
      await updatePFOrderStatus(order.id, { status: "PAID" });
      Swal.fire({
        icon: "success",
        title: "Pedido cobrado",
        timer: 2000,
        showConfirmButton: false,
      });
      load(page, statusFilter, search, dateFrom, dateTo);
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Error al procesar", "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (order: PFOrder) => {
    const result = await Swal.fire({
      title: "¿Rechazar pedido?",
      html: `<p class="text-sm text-gray-600">El stock reservado se restaurará automáticamente.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, rechazar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    setProcessing(order.id);
    try {
      const { whatsappSent, whatsappRequired } = await updatePFOrderStatus(order.id, {
        status: "DECLINED",
      });
      if (whatsappRequired && !whatsappSent) {
        Swal.fire({
          icon: "warning",
          title: "Pedido rechazado",
          text: "El estado se actualizó pero no se pudo enviar el WhatsApp. Verificá que el número esté vinculado.",
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "Pedido rechazado",
          text: "WhatsApp enviado automáticamente al cliente.",
          timer: 2500,
          showConfirmButton: false,
        });
      }
      load(page, statusFilter, search, dateFrom, dateTo);
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Error al procesar", "error");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusFilter === tab.key
                ? "border-[#4166e0] text-[#4166e0]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Barra de filtros ── */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#044389]/30 focus:border-[#044389]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Desde</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#044389]/30 focus:border-[#044389]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Hasta</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#044389]/30 focus:border-[#044389]"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="w-3 h-3" />
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8" />
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Teléfono</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Total</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    <td className="pl-4 py-3 text-gray-400">
                      {expandedId === order.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">
                        {order.clientName} {order.clientSurname}
                      </p>
                      <p className="text-xs text-gray-400">{order.clientEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={whatsappLink(order.clientPhone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-green-600 hover:underline font-medium"
                      >
                        {order.clientPhone}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-medium">${Number(order.total).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status]}`}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {order.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(order)}
                            disabled={processing === order.id}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            Aceptar
                          </button>
                          <button
                            onClick={() => handleDecline(order)}
                            disabled={processing === order.id}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                      {order.status === "ACCEPTED" && (
                        <button
                          onClick={() => handleMarkAsPaid(order)}
                          disabled={processing === order.id}
                          className="px-3 py-1 bg-indigo-600 text-white text-xs rounded font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          Cobrado
                        </button>
                      )}
                      {order.status !== "PENDING" && order.status !== "ACCEPTED" && order.note && (
                        <p
                          className="text-xs text-gray-400 italic max-w-[160px] truncate"
                          title={order.note}
                        >
                          {order.note}
                        </p>
                      )}
                    </td>
                  </tr>
                  {expandedId === order.id && (
                    <tr
                      key={`${order.id}-detail`}
                      className="bg-blue-50/40 border-b border-gray-100"
                    >
                      <td colSpan={7} className="px-8 py-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-4">
                          <div>
                            <span className="text-gray-400">DNI:</span>{" "}
                            <span className="text-gray-700 font-medium">{order.clientDni}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">CUIL/CUIT:</span>{" "}
                            <span className="text-gray-700 font-medium">{order.clientCuil}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-400">Dirección:</span>{" "}
                            <span className="text-gray-700 font-medium">{order.clientAddress}</span>
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Productos del pedido
                        </p>
                        <div className="flex flex-col gap-1">
                          {(order.items ?? []).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm text-gray-700 bg-white rounded px-3 py-2 border border-gray-100"
                            >
                              <span className="font-medium">
                                {item.product?.name ?? item.productId}
                              </span>
                              <span className="text-gray-400">x{item.quantity}</span>
                              <span>${Number(item.unitPrice).toFixed(2)} c/u</span>
                              <span className="font-semibold">
                                ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <p className="text-center py-10 text-gray-400">
              No hay pedidos{statusFilter !== "ALL" ? " en este estado" : ""}.
            </p>
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      )}

      {/* Accept modal — item selection */}
      {acceptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Confirmar pedido</h2>
            <p className="text-sm text-gray-500 mb-4">
              {acceptModal.order.clientName} {acceptModal.order.clientSurname} —{" "}
              <a
                href={whatsappLink(acceptModal.order.clientPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline"
              >
                {acceptModal.order.clientPhone}
              </a>
            </p>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Productos — destildá los que no tenés
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {(acceptModal.order.items ?? []).map((item) => {
                const checked = acceptModal.confirmedIds.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-gray-50 opacity-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item.id)}
                      className="accent-green-600"
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800">
                      {item.product?.name ?? item.productId}
                    </span>
                    <span className="text-sm text-gray-500">x{item.quantity}</span>
                    <span className="text-sm font-semibold text-gray-700">
                      ${(Number(item.unitPrice) * item.quantity).toLocaleString("es-AR")}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between mb-5">
              <span className="text-sm text-gray-500">Total confirmado</span>
              <span className="text-lg font-black text-gray-800">
                $
                {(acceptModal.order.items ?? [])
                  .filter((i) => acceptModal.confirmedIds.has(i.id))
                  .reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)
                  .toLocaleString("es-AR")}
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAcceptModal(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAccept}
                disabled={acceptModal.confirmedIds.size === 0}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Confirmar pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Products ────────────────────────────────────────────────────────────

function ProductsTab() {
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

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    stock: "0",
  });

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
      name: "",
      description: "",
      price: "",
      categoryId: categories[0]?.id ?? "",
      stock: "0",
    });
    setShowModal(true);
  };

  const openEdit = (p: PFProduct) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      categoryId: p.categoryId,
      stock: String(p.stock),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.categoryId) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        categoryId: form.categoryId,
        stock: parseInt(form.stock) || 0,
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
      console.error(e);
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
      console.error(e);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          {products.length} producto{products.length !== 1 ? "s" : ""}
        </p>
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
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Producto</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Categoría</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Precio</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Stock</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                        ${Number(p.price).toFixed(2)}
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
          {products.length === 0 && (
            <p className="text-center py-10 text-gray-400">
              No hay productos. Creá el primero con el botón de arriba.
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

// ─── Tab: Categories ──────────────────────────────────────────────────────────

function CategoriesTab() {
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
      console.error(e);
    }
  };

  const handleDelete = async (c: PFCategory) => {
    const result = await Swal.fire({
      title: "¿Eliminar categoría?",
      text: `"${c.name}" se eliminará. Los productos de esta categoría quedarán sin categoría.`,
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
      console.error(e);
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

// ─── Tab: Summary ────────────────────────────────────────────────────────────

interface PFStats {
  total: number;
  pending: number;
  accepted: number;
  paid: number;
  declined: number;
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
  lowStock: PFProduct[];
}

function PFStatCard({
  title,
  value,
  sub,
  loading,
  accent,
}: {
  title: string;
  value?: number;
  sub?: string;
  loading: boolean;
  accent: string;
}) {
  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <p className="text-3xl font-bold" style={{ color: accent }}>
              {value ?? 0}
            </p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

type Period = "day" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  day: "Hoy",
  week: "Esta semana",
  month: "Este mes",
  year: "Este año",
};

interface FinancialStats {
  paidTotal: number;
  acceptedTotal: number;
  periodPaidCount: number;
  periodPaidAmount: number;
  periodAcceptedCount: number;
  periodAcceptedAmount: number;
}

function SummaryTab({ refreshSignal }: { refreshSignal: number }) {
  const [stats, setStats] = useState<PFStats | null>(null);
  const [financial, setFinancial] = useState<FinancialStats | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [financialLoading, setFinancialLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [all, pending, accepted, paid, declined, products, categories] = await Promise.all([
          getPFOrders({ limit: 1 }),
          getPFOrders({ status: "PENDING", limit: 1 }),
          getPFOrders({ status: "ACCEPTED", limit: 1 }),
          getPFOrders({ status: "PAID", limit: 1 }),
          getPFOrders({ status: "DECLINED", limit: 1 }),
          getPFProducts({ all: true }),
          getPFCategories(),
        ]);

        const activeProducts = products.filter((p) => p.active);
        const lowStock = activeProducts
          .filter((p) => p.stock < 5)
          .sort((a, b) => a.stock - b.stock);

        setStats({
          total: all.total,
          pending: pending.total,
          accepted: accepted.total,
          paid: paid.total,
          declined: declined.total,
          totalProducts: products.length,
          activeProducts: activeProducts.length,
          totalCategories: categories.length,
          lowStock,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshSignal]);

  useEffect(() => {
    async function loadFinancial() {
      setFinancialLoading(true);
      try {
        setFinancial(await getPFOrderStats(period));
      } catch (e) {
        console.error(e);
      } finally {
        setFinancialLoading(false);
      }
    }
    loadFinancial();
  }, [period, refreshSignal]);

  const fmt = (n: number) =>
    n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

  return (
    <div>
      {/* ── Ingresos ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="border-gray-200 bg-indigo-50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
              Total cobrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financialLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-3xl font-bold text-indigo-700">
                {fmt(financial?.paidTotal ?? 0)}
              </p>
            )}
            <p className="text-xs text-indigo-400 mt-1">Pedidos marcados como cobrados</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-amber-50">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
              Por cobrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financialLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-3xl font-bold text-amber-600">
                {fmt(financial?.acceptedTotal ?? 0)}
              </p>
            )}
            <p className="text-xs text-amber-400 mt-1">Pedidos aceptados pendientes de pago</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Estado de ventas (filtrable) ── */}
      <Card className="border-gray-200 mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Estado de ventas — confirmados
            </CardTitle>
            <div className="flex gap-1">
              {(["day", "week", "month", "year"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                    period === p
                      ? "bg-[#044389] text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {financialLoading ? (
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-indigo-50 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">
                  Cobrados
                </p>
                <p className="text-2xl font-bold text-indigo-700">
                  {fmt(financial?.periodPaidAmount ?? 0)}
                </p>
                <p className="text-xs text-indigo-400 mt-0.5">
                  {financial?.periodPaidCount ?? 0} pedido
                  {(financial?.periodPaidCount ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">
                  Por cobrar
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  {fmt(financial?.periodAcceptedAmount ?? 0)}
                </p>
                <p className="text-xs text-amber-400 mt-0.5">
                  {financial?.periodAcceptedCount ?? 0} pedido
                  {(financial?.periodAcceptedCount ?? 0) !== 1 ? "s" : ""} aceptados sin cobrar
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Conteos generales ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <PFStatCard title="Pedidos totales" loading={loading} value={stats?.total} accent="#044389" />
        <PFStatCard title="Pendientes" loading={loading} value={stats?.pending} accent="#FFAD05" />
        <PFStatCard title="Cobrados" loading={loading} value={stats?.paid} accent="#4f46e5" />
        <PFStatCard
          title="Productos activos"
          loading={loading}
          value={stats?.activeProducts}
          sub={stats ? `${stats.totalCategories} categorías` : undefined}
          accent="#044389"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Pedidos por estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Pendientes", value: stats?.pending ?? 0, color: "bg-yellow-400" },
                  { label: "Aceptados", value: stats?.accepted ?? 0, color: "bg-green-500" },
                  { label: "Cobrados", value: stats?.paid ?? 0, color: "bg-indigo-500" },
                  { label: "Rechazados", value: stats?.declined ?? 0, color: "bg-red-400" },
                ].map((item) => {
                  const total = stats?.total ?? 1;
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">{item.label}</span>
                        <span className="text-sm font-semibold text-gray-700">
                          {item.value}{" "}
                          <span className="text-xs text-gray-400 font-normal">({pct}%)</span>
                        </span>
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

        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Estado del catálogo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  {
                    label: "Productos activos",
                    value: stats?.activeProducts ?? 0,
                    total: stats?.totalProducts ?? 1,
                    color: "bg-green-500",
                  },
                  {
                    label: "Productos pausados",
                    value: (stats?.totalProducts ?? 0) - (stats?.activeProducts ?? 0),
                    total: stats?.totalProducts ?? 1,
                    color: "bg-red-400",
                  },
                ].map((item) => {
                  const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">{item.label}</span>
                        <span className="text-sm font-semibold text-gray-700">
                          {item.value}{" "}
                          <span className="text-xs text-gray-400 font-normal">({pct}%)</span>
                        </span>
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

      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Stock bajo{!loading && stats && ` (${stats.lowStock.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : stats?.lowStock.length === 0 ? (
            <p className="text-sm text-gray-400 px-6 pb-4">
              Todos los productos activos tienen stock suficiente.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">
                    Producto
                  </th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">
                    Categoría
                  </th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {stats?.lowStock.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-700">{p.name}</td>
                    <td className="px-4 py-2 text-gray-400">{p.category?.name ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.stock === 0
                            ? "bg-red-100 text-red-600"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        {p.stock}
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

// ─── Tab: Ads (placeholder) ───────────────────────────────────────────────────

function AdsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <p className="text-lg font-medium">Anuncios</p>
      <p className="text-sm mt-1">Próximamente</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: "summary", label: "Inicio" },
  { key: "orders", label: "Pedidos" },
  { key: "products", label: "Productos" },
  { key: "categories", label: "Categorías" },
  { key: "ads", label: "Anuncios" },
];

export default function PuntoFiestaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") ?? "summary") as Tab;
  const setActiveTab = useCallback(
    (tab: Tab) => router.replace(`/punto-fiesta?tab=${tab}`),
    [router]
  );
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [toasts, setToasts] = useState<
    { id: string; orderId: string; clientName: string; clientSurname: string; total: number }[]
  >([]);

  const knownOrderIds = useRef<Set<string>>(new Set());
  const notificationReady = useRef(false);
  const blinkInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitle = useRef("");
  const pendingCount = useRef(0);

  const stopBlinking = useCallback(() => {
    if (blinkInterval.current) {
      clearInterval(blinkInterval.current);
      blinkInterval.current = null;
    }
    if (originalTitle.current) document.title = originalTitle.current;
    pendingCount.current = 0;
  }, []);

  const startBlinking = useCallback(() => {
    if (blinkInterval.current) return;
    originalTitle.current = document.title;
    let show = true;
    blinkInterval.current = setInterval(() => {
      const n = pendingCount.current;
      document.title = show
        ? n === 1
          ? "🛒 ¡Nuevo pedido!"
          : `🛒 ¡${n} pedidos nuevos!`
        : originalTitle.current;
      show = !show;
    }, 800);
  }, []);

  useEffect(() => {
    window.addEventListener("focus", stopBlinking);
    return () => window.removeEventListener("focus", stopBlinking);
  }, [stopBlinking]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Polling cada 10s — siempre activo mientras el admin esté en la página
  useEffect(() => {
    const check = async () => {
      try {
        const result = await getPFOrders({ status: "PENDING", page: 1, limit: 50 });
        const incoming = result.items;
        if (!notificationReady.current) {
          incoming.forEach((o) => knownOrderIds.current.add(o.id));
          notificationReady.current = true;
          return;
        }
        const newOrders = incoming.filter((o) => !knownOrderIds.current.has(o.id));
        newOrders.forEach((order) => {
          knownOrderIds.current.add(order.id);
          pendingCount.current += 1;
          playNotificationSound();
          setToasts((prev) => [
            ...prev,
            {
              id: `${order.id}-${Date.now()}`,
              orderId: order.id,
              clientName: order.clientName,
              clientSurname: order.clientSurname,
              total: Number(order.total),
            },
          ]);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("🛒 Nuevo pedido — Punto Fiesta", {
              body: `${order.clientName} ${order.clientSurname} · $${Number(order.total).toLocaleString("es-AR")}`,
              icon: "/favicon.ico",
            });
          }
        });
        if (newOrders.length > 0) {
          startBlinking();
          setRefreshSignal((s) => s + 1);
        }
      } catch {}
    };
    check();
    const interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, [startBlinking]);

  const handleToastClick = (toastId: string, orderId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
    setActiveTab("orders");
    setPendingOrderId(orderId);
  };

  return (
    <div>
      {activeTab === "summary" && <SummaryTab refreshSignal={refreshSignal} />}
      {activeTab === "orders" && (
        <OrdersTab
          pendingOrderId={pendingOrderId}
          onOrderHandled={() => setPendingOrderId(null)}
          refreshSignal={refreshSignal}
        />
      )}
      {activeTab === "products" && <ProductsTab />}
      {activeTab === "categories" && <CategoriesTab />}
      {activeTab === "ads" && <AdsTab />}

      {/* Toasts de pedidos nuevos — siempre visibles en cualquier tab */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-start gap-3 bg-white border-l-4 border-[#044389] rounded-xl shadow-lg px-4 py-3 w-72"
            >
              <span className="text-xl mt-0.5">🛒</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#044389] uppercase tracking-wide">
                  Nuevo pedido
                </p>
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {toast.clientName} {toast.clientSurname}
                </p>
                <p className="text-xs text-gray-500">${toast.total.toLocaleString("es-AR")}</p>
                <button
                  onClick={() => handleToastClick(toast.id, toast.orderId)}
                  className="mt-1.5 text-xs font-semibold text-[#044389] hover:underline"
                >
                  Ver pedido →
                </button>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none mt-0.5"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
