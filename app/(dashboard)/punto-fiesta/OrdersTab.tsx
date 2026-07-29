"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { getPFOrders, updatePFOrderStatus } from "@/services/pfOrderService";
import type { PFOrder, PaginatedPFOrders } from "@/lib/schemas";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import Swal from "sweetalert2";
import {
  StatusFilter,
  DeliveryFilter,
  PAGE_SIZE,
  STATUS_TABS,
  DELIVERY_TABS,
  DELIVERY_LABEL,
  DELIVERY_ICON,
  STATUS_BADGE,
  STATUS_LABEL,
  formatDate,
  formatOrderNumber,
  whatsappLink,
} from "./_shared";

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

export function OrdersTab({
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
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("ALL");
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
  }, [search, dateFrom, dateTo, statusFilter, deliveryFilter]);

  const load = useCallback(
    async (
      p: number,
      status: StatusFilter,
      delivery: DeliveryFilter,
      srch: string,
      from: string,
      to: string
    ) => {
      setLoading(true);
      try {
        const params: Parameters<typeof getPFOrders>[0] = { page: p, limit: PAGE_SIZE };
        if (status !== "ALL") params.status = status;
        if (delivery !== "ALL") params.deliveryMethod = delivery;
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
    load(page, statusFilter, deliveryFilter, search, dateFrom, dateTo);
  }, [page, statusFilter, deliveryFilter, search, dateFrom, dateTo, load]);

  // Refs for refresh signal (reads latest state without re-subscribing)
  const loadRef = useRef(load);
  const pageRef = useRef(page);
  const filterRef = useRef(statusFilter);
  const deliveryFilterRef = useRef(deliveryFilter);
  const searchRef = useRef(search);
  const dateFromRef = useRef(dateFrom);
  const dateToRef = useRef(dateTo);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { filterRef.current = statusFilter; }, [statusFilter]);
  useEffect(() => { deliveryFilterRef.current = deliveryFilter; }, [deliveryFilter]);
  useEffect(() => { searchRef.current = search; }, [search]);
  useEffect(() => { dateFromRef.current = dateFrom; }, [dateFrom]);
  useEffect(() => { dateToRef.current = dateTo; }, [dateTo]);

  useEffect(() => {
    if (refreshSignal === 0) return;
    loadRef.current(
      pageRef.current,
      filterRef.current,
      deliveryFilterRef.current,
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

  const handleDeliveryTabChange = (tab: DeliveryFilter) => {
    setDeliveryFilter(tab);
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
      load(page, statusFilter, deliveryFilter, search, dateFrom, dateTo);
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Error al procesar", "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkAsPaid = async (order: PFOrder) => {
    const result = await Swal.fire({
      title: "¿Marcar como cobrado?",
      text: `Confirmás que recibiste el pago de ${order.clientName} ${order.clientSurname}.`,
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
      load(page, statusFilter, deliveryFilter, search, dateFrom, dateTo);
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Error al procesar", "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (order: PFOrder) => {
    const isAccepted = order.status === "ACCEPTED";
    const result = await Swal.fire({
      title: isAccepted ? "¿Cancelar pedido aceptado?" : "¿Rechazar pedido?",
      html: `<p class="text-sm text-gray-600">${
        isAccepted
          ? "Para cuando el cliente aceptó pero nunca pagó. "
          : ""
      }El stock reservado se restaurará automáticamente.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: isAccepted ? "Sí, cancelar" : "Sí, rechazar",
      cancelButtonText: "Volver",
    });
    if (!result.isConfirmed) return;
    setProcessing(order.id);
    try {
      const { whatsappSent, whatsappRequired } = await updatePFOrderStatus(order.id, {
        status: "DECLINED",
      });
      const title = isAccepted ? "Pedido cancelado" : "Pedido rechazado";
      if (whatsappRequired && !whatsappSent) {
        Swal.fire({
          icon: "warning",
          title,
          text: "El estado se actualizó pero no se pudo enviar el WhatsApp. Verificá que el número esté vinculado.",
        });
      } else {
        Swal.fire({
          icon: "success",
          title,
          text: "WhatsApp enviado automáticamente al cliente.",
          timer: 2500,
          showConfirmButton: false,
        });
      }
      load(page, statusFilter, deliveryFilter, search, dateFrom, dateTo);
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Error al procesar", "error");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors shrink-0 ${
              statusFilter === tab.key
                ? "border-[#4166e0] text-[#4166e0]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {DELIVERY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleDeliveryTabChange(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              deliveryFilter === tab.key
                ? "bg-[#4166e0] text-white border-[#4166e0]"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
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
            placeholder="Buscar por nombre o número de pedido..."
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
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8" />
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Nº</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Teléfono</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Total</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Entrega</th>
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
                    <td className="px-4 py-3 text-gray-500 font-mono">
                      {formatOrderNumber(order.orderNumber)}
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
                    <td className="px-4 py-3 text-lg" title={DELIVERY_LABEL[order.deliveryMethod]}>
                      {DELIVERY_ICON[order.deliveryMethod]}
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMarkAsPaid(order)}
                            disabled={processing === order.id}
                            className="px-3 py-1 bg-indigo-600 text-white text-xs rounded font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            Cobrado
                          </button>
                          <button
                            onClick={() => handleDecline(order)}
                            disabled={processing === order.id}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
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
                      <td colSpan={9} className="px-8 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                              order.deliveryMethod === "PICKUP"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {DELIVERY_LABEL[order.deliveryMethod]}
                          </span>
                          <span className="text-xs font-mono text-gray-400">
                            Pedido {formatOrderNumber(order.orderNumber)}
                          </span>
                        </div>
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
          </div>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              Confirmar pedido{" "}
              <span className="text-gray-400 font-mono">
                {formatOrderNumber(acceptModal.order.orderNumber)}
              </span>
            </h2>
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
            <span
              className={`inline-block mb-4 px-2.5 py-1 rounded-full text-xs font-medium ${
                acceptModal.order.deliveryMethod === "PICKUP"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-sky-100 text-sky-700"
              }`}
            >
              {DELIVERY_LABEL[acceptModal.order.deliveryMethod]}
            </span>

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
