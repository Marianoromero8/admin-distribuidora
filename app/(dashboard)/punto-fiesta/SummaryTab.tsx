"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { getPFOrders, getPFOrderStats } from "@/services/pfOrderService";
import { getPFProducts } from "@/services/pfProductService";
import { getPFCategories } from "@/services/pfCategoryService";
import { getPFSettings, updatePFSettings } from "@/services/pfSettingsService";
import { getWhatsAppStatus, getWhatsAppQr, reconnectWhatsApp } from "@/services/pfWhatsappService";
import {
  getPFMessageTemplates,
  updatePFMessageTemplate,
} from "@/services/pfMessageTemplateService";
import type { PFProduct, PFSettings, PFMessageTemplate } from "@/lib/schemas";
import { X, Info, AlertTriangle, Pencil, MessageSquare } from "lucide-react";
import Swal from "sweetalert2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtMoney } from "./_shared";

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
    <Card className="border-gray-200 border-l-4" style={{ borderLeftColor: accent }}>
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

// ─── Payment info modal (Alias / CBU / Titular / CUIL / Teléfono) ────────────

const SETTINGS_FIELDS: { key: keyof PFSettingsForm; label: string }[] = [
  { key: "alias", label: "Alias" },
  { key: "cbu", label: "CBU" },
  { key: "accountHolderName", label: "Titular" },
  { key: "cuil", label: "CUIL/CUIT" },
  { key: "phone", label: "Teléfono" },
  { key: "address", label: "Dirección de retiro" },
  { key: "instagramUrl", label: "Instagram (link)" },
  { key: "facebookUrl", label: "Facebook (link)" },
  { key: "whatsappUrl", label: "WhatsApp (link wa.me)" },
];

type PFSettingsForm = {
  accountHolderName: string;
  cuil: string;
  alias: string;
  cbu: string;
  phone: string;
  address: string;
  instagramUrl: string;
  facebookUrl: string;
  whatsappUrl: string;
};

function WhatsAppQrModal({
  onClose,
  onConnected,
}: {
  onClose: () => void;
  onConnected: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let qrInterval: ReturnType<typeof setInterval> | undefined;
    let statusInterval: ReturnType<typeof setInterval> | undefined;

    async function start() {
      try {
        await reconnectWhatsApp();
      } catch (e) {
        const message = e instanceof Error ? e.message : "No se pudo iniciar la conexión";
        if (message.includes("ya está conectado")) {
          if (!cancelled) {
            onConnected();
            onClose();
          }
          return;
        }
        if (!cancelled) setError(message);
        return;
      }

      if (cancelled) return;

      qrInterval = setInterval(async () => {
        try {
          const nextQr = await getWhatsAppQr();
          if (!cancelled && nextQr) setQr(nextQr);
        } catch {
          // sigue reintentando
        }
      }, 2000);

      statusInterval = setInterval(async () => {
        try {
          const status = await getWhatsAppStatus();
          if (!cancelled && status.ready) {
            onConnected();
            onClose();
          }
        } catch {
          // sigue reintentando
        }
      }, 2000);
    }

    start();

    return () => {
      cancelled = true;
      clearInterval(qrInterval);
      clearInterval(statusInterval);
    };
  }, [onClose, onConnected]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Conectar WhatsApp</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : qr ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Código QR de WhatsApp" className="h-56 w-56" />
            <p className="text-sm text-gray-500 text-center">
              Escaneá este código con WhatsApp en el teléfono de la empresa (Dispositivos
              vinculados → Vincular un dispositivo).
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10">
            <Skeleton className="h-48 w-48" />
            <p className="text-sm text-gray-500">Generando código QR...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentInfoModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<PFSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PFSettingsForm>({
    accountHolderName: "",
    cuil: "",
    alias: "",
    cbu: "",
    phone: "",
    address: "",
    instagramUrl: "",
    facebookUrl: "",
    whatsappUrl: "",
  });

  useEffect(() => {
    getPFSettings()
      .then((data) => {
        setSettings(data);
        setForm({
          accountHolderName: data.accountHolderName,
          cuil: data.cuil,
          alias: data.alias,
          cbu: data.cbu,
          phone: data.phone,
          address: data.address,
          instagramUrl: data.instagramUrl,
          facebookUrl: data.facebookUrl,
          whatsappUrl: data.whatsappUrl,
        });
      })
      .catch(() => Swal.fire("Error", "No se pudieron cargar los datos", "error"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updatePFSettings(form);
      setSettings(updated);
      setEditing(false);
      Swal.fire("Guardado", "Los datos fueron actualizados", "success");
    } catch {
      Swal.fire("Error", "No se pudieron guardar los cambios", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (settings) {
      setForm({
        accountHolderName: settings.accountHolderName,
        cuil: settings.cuil,
        alias: settings.alias,
        cbu: settings.cbu,
        phone: settings.phone,
        address: settings.address,
        instagramUrl: settings.instagramUrl,
        facebookUrl: settings.facebookUrl,
        whatsappUrl: settings.whatsappUrl,
      });
    }
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Datos del negocio</h2>
          <div className="flex items-center gap-3">
            {!loading && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-gray-400 hover:text-black transition-colors"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : editing ? (
          <div className="flex flex-col gap-3">
            {SETTINGS_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {label}
                </label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-black"
                />
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#262626] disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {SETTINGS_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex justify-between gap-4 text-sm py-1 border-b border-gray-100">
                <span className="text-gray-400">{label}</span>
                <span className="text-gray-800 font-medium text-right">
                  {settings?.[key] || "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TEMPLATE_VARIABLES: Record<string, { token: string; label: string }[]> = {
  ORDER_ACCEPTED_PICKUP: [
    { token: "nombre", label: "Nombre del cliente" },
    { token: "productos", label: "Lista de productos" },
    { token: "total", label: "Total del pedido" },
    { token: "datos_transferencia", label: "Alias / CBU / Titular" },
    { token: "direccion_local", label: "Dirección del local" },
  ],
  ORDER_ACCEPTED_DELIVERY: [
    { token: "nombre", label: "Nombre del cliente" },
    { token: "productos", label: "Lista de productos" },
    { token: "total", label: "Total del pedido" },
    { token: "datos_transferencia", label: "Alias / CBU / Titular" },
    { token: "direccion_cliente", label: "Dirección del cliente" },
  ],
  ORDER_DECLINED: [
    { token: "nombre", label: "Nombre del cliente" },
    { token: "instagram", label: "Instagram" },
    { token: "facebook", label: "Facebook" },
    { token: "whatsapp", label: "WhatsApp" },
  ],
};

function MessageTemplatesModal({ onClose }: { onClose: () => void }) {
  const [templates, setTemplates] = useState<PFMessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getPFMessageTemplates()
      .then((data) => {
        setTemplates(data);
        setDrafts(Object.fromEntries(data.map((t) => [t.key, t.body])));
      })
      .catch(() => Swal.fire("Error", "No se pudieron cargar las plantillas", "error"))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (t: PFMessageTemplate) => {
    setDrafts((prev) => ({ ...prev, [t.key]: t.body }));
    setEditingKey(t.key);
  };

  const cancelEdit = (t: PFMessageTemplate) => {
    setDrafts((prev) => ({ ...prev, [t.key]: t.body }));
    setEditingKey(null);
  };

  const insertVariable = (key: string, token: string) => {
    const el = textareaRef.current;
    const current = drafts[key] ?? "";
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}[${token}]${current.slice(end)}`;
    setDrafts((prev) => ({ ...prev, [key]: next }));
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + token.length + 2;
      el?.setSelectionRange(pos, pos);
    });
  };

  const handleSave = async (t: PFMessageTemplate) => {
    setSaving(t.key);
    try {
      const updated = await updatePFMessageTemplate(t.key, drafts[t.key] ?? t.body);
      setTemplates((prev) => prev.map((x) => (x.key === t.key ? updated : x)));
      setEditingKey(null);
      Swal.fire("Guardado", "El mensaje fue actualizado", "success");
    } catch {
      Swal.fire("Error", "No se pudo guardar el mensaje", "error");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Mensajes de WhatsApp</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {templates.map((t) => {
              const isEditing = editingKey === t.key;
              const variables = TEMPLATE_VARIABLES[t.key] ?? [];
              return (
                <div key={t.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">{t.label}</h3>
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(t)}
                        className="text-gray-400 hover:text-black transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <>
                      <textarea
                        ref={textareaRef}
                        rows={10}
                        value={drafts[t.key] ?? t.body}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [t.key]: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-black"
                      />
                      {variables.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {variables.map((v) => (
                            <button
                              key={v.token}
                              type="button"
                              onClick={() => insertVariable(t.key, v.token)}
                              className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1 hover:bg-black/10 hover:text-black transition-colors"
                            >
                              + {v.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleSave(t)}
                          disabled={saving === t.key}
                          className="flex-1 bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#262626] disabled:opacity-50"
                        >
                          {saving === t.key ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          onClick={() => cancelEdit(t)}
                          disabled={saving === t.key}
                          className="flex-1 border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded px-3 py-2">
                        {t.body}
                      </p>
                      {variables.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {variables.map((v) => (
                            <span
                              key={v.token}
                              className="text-xs bg-gray-100 text-gray-500 rounded-full px-2.5 py-1"
                            >
                              {v.label} <span className="text-gray-400">[{v.token}]</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function SummaryTab({ refreshSignal }: { refreshSignal: number }) {
  const [stats, setStats] = useState<PFStats | null>(null);
  const [financial, setFinancial] = useState<FinancialStats | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [financialLoading, setFinancialLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [waConnected, setWaConnected] = useState(true);

  useEffect(() => {
    async function checkWhatsapp() {
      try {
        const status = await getWhatsAppStatus();
        setWaConnected(status.ready);
      } catch (e) {
        console.error(e);
      }
    }
    checkWhatsapp();
    const interval = setInterval(checkWhatsapp, 30_000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadStats();
  }, [refreshSignal, loadStats]);

  const loadFinancial = useCallback(async () => {
    setFinancialLoading(true);
    try {
      setFinancial(await getPFOrderStats(period));
    } catch (e) {
      console.error(e);
    } finally {
      setFinancialLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadFinancial();
  }, [refreshSignal, loadFinancial]);

  return (
    <div>
      {!waConnected && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium flex-1">
            WhatsApp desconectado para mensajes automáticos — los clientes no están
            recibiendo la confirmación de pago. Contactá a soporte técnico.
          </p>
          <button
            onClick={() => setShowQrModal(true)}
            className="shrink-0 bg-red-600 text-white text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded hover:bg-red-700 transition-colors"
          >
            Conectar
          </button>
        </div>
      )}

      {showQrModal && (
        <WhatsAppQrModal
          onClose={() => setShowQrModal(false)}
          onConnected={() => {
            setWaConnected(true);
            loadStats();
            loadFinancial();
          }}
        />
      )}

      <div className="flex justify-end gap-4 mb-4">
        <button
          onClick={() => setShowMessages(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-black uppercase tracking-wide hover:underline"
        >
          <MessageSquare className="h-4 w-4" />
          Mensajes
        </button>
        <button
          onClick={() => setShowInfo(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-black uppercase tracking-wide hover:underline"
        >
          <Info className="h-4 w-4" />
          Info
        </button>
      </div>

      {showInfo && <PaymentInfoModal onClose={() => setShowInfo(false)} />}
      {showMessages && <MessageTemplatesModal onClose={() => setShowMessages(false)} />}

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
                {fmtMoney(financial?.paidTotal ?? 0)}
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
                {fmtMoney(financial?.acceptedTotal ?? 0)}
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
                      ? "bg-[#DC1414] text-white"
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
                  {fmtMoney(financial?.periodPaidAmount ?? 0)}
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
                  {fmtMoney(financial?.periodAcceptedAmount ?? 0)}
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
        <PFStatCard title="Pedidos totales" loading={loading} value={stats?.total} accent="#000000" />
        <PFStatCard title="Pendientes" loading={loading} value={stats?.pending} accent="#DC1414" />
        <PFStatCard title="Cobrados" loading={loading} value={stats?.paid} accent="#4f46e5" />
        <PFStatCard
          title="Productos activos"
          loading={loading}
          value={stats?.activeProducts}
          sub={stats ? `${stats.totalCategories} categorías` : undefined}
          accent="#000000"
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
            <div className="overflow-x-auto">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
