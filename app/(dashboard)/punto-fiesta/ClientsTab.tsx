"use client";
import React, { useState, useEffect, useCallback } from "react";
import { getPFCustomers, getPFCustomerById } from "@/services/pfCustomerService";
import type { PFCustomer } from "@/lib/schemas";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import Swal from "sweetalert2";
import {
  PAGE_SIZE,
  STATUS_BADGE,
  STATUS_LABEL,
  DELIVERY_ICON,
  DELIVERY_LABEL,
  formatDate,
  formatOrderNumber,
  whatsappLink,
  fmtMoney,
} from "./_shared";

// ─── Tab: Clients ──────────────────────────────────────────────────────────

export function ClientsTab() {
  const [customers, setCustomers] = useState<PFCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<PFCustomer | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const load = useCallback(async (p: number, srch: string) => {
    setLoading(true);
    try {
      const result = await getPFCustomers({ page: p, limit: PAGE_SIZE, search: srch || undefined });
      setCustomers(result.items);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, search);
  }, [page, search, load]);

  const toggleExpand = async (customer: PFCustomer) => {
    setExpandedOrderId(null);
    if (expandedId === customer.id) {
      setExpandedId(null);
      setExpandedCustomer(null);
      return;
    }
    setExpandedId(customer.id);
    setExpandedLoading(true);
    try {
      setExpandedCustomer(await getPFCustomerById(customer.id));
    } catch (e) {
      Swal.fire("Error", e instanceof Error ? e.message : "No se pudo cargar el historial", "error");
      setExpandedId(null);
    } finally {
      setExpandedLoading(false);
    }
  };

  const paidTotal = (expandedCustomer?.orders ?? [])
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + Number(o.total), 0);
  const pendingTotal = (expandedCustomer?.orders ?? [])
    .filter((o) => o.status === "ACCEPTED")
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/30 focus:border-black"
          />
        </div>
        <p className="text-sm text-gray-500 shrink-0">
          {total} cliente{total !== 1 ? "s" : ""}
        </p>
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
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">DNI</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Teléfono</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Pedidos</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Total gastado</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Último pedido</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <React.Fragment key={customer.id}>
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(customer)}
                    >
                      <td className="pl-4 py-3 text-gray-400">
                        {expandedId === customer.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">
                          {customer.name} {customer.surname}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono">{customer.dni}</td>
                      <td className="px-4 py-3 text-gray-500">{customer.email || "—"}</td>
                      <td className="px-4 py-3">
                        <a
                          href={whatsappLink(customer.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-green-600 hover:underline font-medium"
                        >
                          {customer.phone || "—"}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-medium">{customer.ordersCount ?? 0}</td>
                      <td className="px-4 py-3 font-medium">{fmtMoney(customer.totalSpent ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDate(customer.lastOrderAt)}
                      </td>
                    </tr>
                    {expandedId === customer.id && (
                      <tr key={`${customer.id}-detail`} className="bg-blue-50/40 border-b border-gray-100">
                        <td colSpan={8} className="px-8 py-4">
                          {expandedLoading ? (
                            <p className="text-sm text-gray-400">Cargando historial...</p>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-3">
                                <div>
                                  <span className="text-gray-400">CUIL/CUIT:</span>{" "}
                                  <span className="text-gray-700 font-medium">
                                    {expandedCustomer?.cuil || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Cliente desde:</span>{" "}
                                  <span className="text-gray-700 font-medium">
                                    {formatDate(expandedCustomer?.firstOrderAt)}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-400">Dirección:</span>{" "}
                                  <span className="text-gray-700 font-medium">
                                    {expandedCustomer?.address || "—"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                  Pagado: {fmtMoney(paidTotal)}
                                </span>
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                  Pendiente de cobro: {fmtMoney(pendingTotal)}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Historial de pedidos
                              </p>
                              <div className="flex flex-col gap-1">
                                {(expandedCustomer?.orders ?? []).map((order) => (
                                  <div
                                    key={order.id}
                                    className="bg-white rounded border border-gray-100 overflow-hidden"
                                  >
                                    <div
                                      className="items-center text-sm text-gray-700 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: "20px 80px 130px 32px 110px 1fr",
                                        columnGap: "150px",
                                      }}
                                      onClick={() =>
                                        setExpandedOrderId((cur) => (cur === order.id ? null : order.id))
                                      }
                                    >
                                      <span className="text-gray-400">
                                        {expandedOrderId === order.id ? (
                                          <ChevronUp className="h-3.5 w-3.5" />
                                        ) : (
                                          <ChevronDown className="h-3.5 w-3.5" />
                                        )}
                                      </span>
                                      <span className="font-mono text-gray-400">
                                        {formatOrderNumber(order.orderNumber)}
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {formatDate(order.createdAt)}
                                      </span>
                                      <span
                                        className="text-center"
                                        title={DELIVERY_LABEL[order.deliveryMethod]}
                                      >
                                        {DELIVERY_ICON[order.deliveryMethod]}
                                      </span>
                                      <span
                                        className={`w-fit px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status]}`}
                                      >
                                        {STATUS_LABEL[order.status]}
                                      </span>
                                      <span className="font-semibold text-right">
                                        {fmtMoney(Number(order.total))}
                                      </span>
                                    </div>
                                    {expandedOrderId === order.id && (
                                      <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 flex flex-col gap-1">
                                        {(order.items ?? []).map((item) => (
                                          <div
                                            key={item.id}
                                            className="grid items-center gap-2 text-xs text-gray-600 bg-white rounded px-2.5 py-1.5 border border-gray-100"
                                            style={{ gridTemplateColumns: "1fr 45px 90px 90px" }}
                                          >
                                            <span className="font-medium truncate">
                                              {item.product?.name ?? item.productId}
                                            </span>
                                            <span className="text-gray-400 text-right">
                                              x{item.quantity}
                                            </span>
                                            <span className="text-right">
                                              {fmtMoney(Number(item.unitPrice))} c/u
                                            </span>
                                            <span className="font-semibold text-right">
                                              {fmtMoney(Number(item.unitPrice) * item.quantity)}
                                            </span>
                                          </div>
                                        ))}
                                        {(order.items ?? []).length === 0 && (
                                          <p className="text-xs text-gray-400">Sin ítems.</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {(expandedCustomer?.orders ?? []).length === 0 && (
                                  <p className="text-sm text-gray-400">Sin pedidos.</p>
                                )}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {customers.length === 0 && (
            <p className="text-center py-10 text-gray-400">
              {search ? "No hay clientes que coincidan con la búsqueda." : "Todavía no hay clientes."}
            </p>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹ Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
