"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getPFOrders } from "@/services/pfOrderService";
import { useRequireAdmin } from "@/lib/auth";
import { Tab, playNotificationSound } from "./_shared";
import { SummaryTab } from "./SummaryTab";
import { OrdersTab } from "./OrdersTab";
import { ProductsTab } from "./ProductsTab";
import { CategoriesTab } from "./CategoriesTab";
import { AdsTab } from "./AdsTab";

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: "summary", label: "Inicio" },
  { key: "orders", label: "Pedidos" },
  { key: "products", label: "Productos" },
  { key: "categories", label: "Categorías" },
  { key: "ads", label: "Anuncios" },
];

export default function PuntoFiestaPage() {
  useRequireAdmin();
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
