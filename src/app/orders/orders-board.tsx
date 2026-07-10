"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock3,
  History,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  ReceiptText,
  Store,
  Truck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { OrderChatLive } from "./order-chat-live";

type ViewFilter = "active" | "delivered" | "cancelled" | "all";
type FulfillmentFilter = "all" | "delivery" | "pickup" | "on_premise";
type OpsAction =
  | "mark_preparing"
  | "mark_ready"
  | "mark_in_transit"
  | "mark_delivered"
  | "mark_cancelled";

type OrderRow = {
  id: string;
  created_at: string;
  status: string | null;
  payment_status: string | null;
  total_amount: number | string | null;
  fulfillment_type: string | null;
  dispatch_status: string | null;
  site_id: string | null;
  source: string | null;
  guest_info: Record<string, unknown> | null;
  contact_phone: string | null;
  notes: string | null;
  delivery_address: Record<string, unknown> | null;
  delivery_zone: string | null;
  dispatch_partner: string | null;
  dispatch_reference: string | null;
};

type OrderItemOptionView = {
  id: string;
  order_item_id: string;
  group_name: string;
  option_name: string;
  quantity: number;
  price_delta_amount: number;
  total_delta_amount: number;
  effect_type: string | null;
};

type OrderItemView = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  notes: string | null;
  options: OrderItemOptionView[];
};

type OrderStatusEventView = {
  id: string;
  order_id: string;
  changed_by: string | null;
  actor_name: string;
  actor_type: string | null;
  operation: string;
  from_status: string | null;
  to_status: string | null;
  from_dispatch_status: string | null;
  to_dispatch_status: string | null;
  dispatch_partner: string | null;
  dispatch_reference: string | null;
  created_at: string;
};

type OrderConversationRow = {
  id: string;
  order_id: string;
  site_id: string;
  client_id: string;
  status: string;
  last_message_at: string | null;
};

type OrderMessageRow = {
  id: string;
  conversation_id: string;
  order_id: string;
  site_id: string;
  author_id: string;
  author_type: "client" | "staff" | "system";
  body: string;
  created_at: string;
};

type SendOrderMessageLiveResult =
  | { ok: true; message: OrderMessageRow }
  | { ok: false; error: string };

type OperationButton = {
  op: OpsAction;
  label: string;
};

type OrderCardData = {
  order: OrderRow;
  billing: OrderBillingRequest | null;
  items: OrderItemView[];
  events: OrderStatusEventView[];
  conversation: OrderConversationRow | null;
  messages: OrderMessageRow[];
  guestName: string | null;
  guestPhone: string | null;
  fullAddress: string | null;
  mapsHref: string | null;
  orderCode: string;
  statusLabel: string;
  statusTone: string;
  paymentLabel: string;
  dispatchLabel: string;
  sourceLabel: string;
  fulfillmentLabel: string;
  itemCount: number;
  paymentBlocked: boolean;
  operationButtons: OperationButton[];
};

type OrdersBoardProps = {
  orders: OrderCardData[];
  siteId: string;
  view: ViewFilter;
  fulfillment: FulfillmentFilter;
  updateOperationalOrderAction: (formData: FormData) => Promise<void>;
  assignDispatchOrderAction: (formData: FormData) => Promise<void>;
  sendOrderMessageLiveAction: (input: {
    conversationId: string;
    orderId: string;
    siteId: string;
    body: string;
  }) => Promise<SendOrderMessageLiveResult>;
};

type ModalTab = "order" | "chat" | "history";

type UnreadRow = {
  order_id: string;
  conversation_id: string;
  unread_count: number | string | null;
};

type OrderBillingRequest = {
  id: string;
  order_id: string;
  client_id: string;
  site_id: string;
  legal_name: string;
  document_type: string;
  document_number: string;
  verification_digit: string | null;
  billing_email: string;
  status: string;
  provider: string | null;
  provider_reference: string | null;
  invoice_number: string | null;
  cufe: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  error_message: string | null;
  requested_at: string;
  submitted_at: string | null;
  issued_at: string | null;
};

const STATUS_ACCENT: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-cyan-500",
  preparing: "bg-orange-400",
  ready_for_dispatch: "bg-blue-500",
  in_transit: "bg-violet-500",
  on_the_way: "bg-violet-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-slate-400",
};

function formatMoney(value: number | string | null) {
  const parsed = Number(value ?? 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Bogota",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCardTime(value: string) {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Bogota",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function optionEffectLabel(effectType: string | null) {
  if (effectType === "additive") return "Extra";
  if (effectType === "replacement") return "Cambio";
  if (effectType === "removal") return "Sin";
  return "Opción";
}

function statusTransitionLabel(value: string | null) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    preparing: "Preparando",
    ready_for_dispatch: "Listo despacho",
    in_transit: "En camino",
    on_the_way: "En camino",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };
  return value ? labels[value] || value : "-";
}

function dispatchTransitionLabel(value: string | null) {
  const labels: Record<string, string> = {
    not_required: "No requerido",
    pending: "Pendiente",
    assigned: "Asignado",
    ready_for_dispatch: "Listo",
    in_transit: "En camino",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };
  return value ? labels[value] || value : "-";
}

function billingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    requested: "Solicitada",
    ready_to_issue: "Lista para emitir",
    submitted: "Enviada al proveedor",
    issued: "Emitida",
    failed: "Con error",
    cancelled: "Cancelada",
  };
  return labels[status] || status;
}

function billingStatusTone(status: string) {
  if (status === "issued" || status === "ready_to_issue") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "failed" || status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function ActionIcon({ op }: { op: OpsAction }) {
  if (op === "mark_delivered") return <CheckCircle2 className="h-4 w-4" />;
  if (op === "mark_cancelled") return <XCircle className="h-4 w-4" />;
  if (op === "mark_in_transit") return <Truck className="h-4 w-4" />;
  return <Clock3 className="h-4 w-4" />;
}

function OrderCard({
  data,
  unreadCount,
  onOpen,
}: {
  data: OrderCardData;
  unreadCount: number;
  onOpen: () => void;
}) {
  const { order, items } = data;
  const firstItems = items.slice(0, 2);
  const remainingItems = Math.max(0, items.length - firstItems.length);
  const accent = STATUS_ACCENT[order.status || "pending"] || "bg-slate-400";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative min-h-[220px] overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
        unreadCount > 0 ? "border-cyan-400 ring-2 ring-cyan-100" : "border-slate-200 hover:border-cyan-300"
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 ${accent}`} />

      {unreadCount > 0 ? (
        <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white shadow-sm">
          <MessageCircle className="h-3.5 w-3.5" />
          {unreadCount > 99 ? "99+" : unreadCount} nuevo{unreadCount === 1 ? "" : "s"}
        </div>
      ) : null}

      <div className={`flex items-start justify-between gap-3 ${unreadCount > 0 ? "pr-28" : ""}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-slate-950">#{data.orderCode}</div>
            <span className={data.statusTone}>{data.statusLabel}</span>
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">{formatCardTime(order.created_at)}</div>
        </div>
        {unreadCount === 0 ? (
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-cyan-600" />
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-800">
        <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="truncate">{data.guestName || "Cliente sin nombre"}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1">
          {order.fulfillment_type === "delivery" ? (
            <Bike className="h-3.5 w-3.5" />
          ) : (
            <Store className="h-3.5 w-3.5" />
          )}
          {data.fulfillmentLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <Package className="h-3.5 w-3.5" />
          {data.itemCount || items.length} producto{(data.itemCount || items.length) === 1 ? "" : "s"}
        </span>
      </div>

      {data.billing ? (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700">
          <ReceiptText className="h-3.5 w-3.5" />
          Factura electrónica
        </div>
      ) : null}

      <div className="mt-4 min-h-[46px] space-y-1">
        {firstItems.length === 0 ? (
          <div className="text-sm text-slate-400">Sin productos visibles</div>
        ) : (
          firstItems.map((item) => (
            <div key={item.id} className="truncate text-sm font-semibold text-slate-700">
              {item.quantity} × {item.product_name}
            </div>
          ))
        )}
        {remainingItems > 0 ? (
          <div className="text-xs font-bold text-cyan-700">
            +{remainingItems} producto{remainingItems === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="min-w-0">
          <div className={`truncate text-xs font-bold ${data.paymentBlocked ? "text-amber-700" : "text-slate-500"}`}>
            {data.paymentLabel}
          </div>
          {order.fulfillment_type === "delivery" ? (
            <div className="mt-0.5 truncate text-[11px] text-slate-400">Despacho: {data.dispatchLabel}</div>
          ) : null}
        </div>
        <div className="shrink-0 text-base font-black text-slate-950">{formatMoney(order.total_amount)}</div>
      </div>
    </button>
  );
}

export function OrdersBoard({
  orders,
  siteId,
  view,
  fulfillment,
  updateOperationalOrderAction,
  assignDispatchOrderAction,
  sendOrderMessageLiveAction,
}: OrdersBoardProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ModalTab>("order");
  const [billingDetailsOpen, setBillingDetailsOpen] = useState(false);
  const [unreadByOrder, setUnreadByOrder] = useState<Record<string, number>>({});
  const selectedOrderIdRef = useRef<string | null>(null);
  const activeTabRef = useRef<ModalTab>("order");
  const supabase = useMemo(() => createClient(), []);

  const selected = useMemo(
    () => orders.find((entry) => entry.order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const selectedBilling = selected?.billing ?? null;

  const totalUnread = useMemo(
    () => Object.values(unreadByOrder).reduce((sum, count) => sum + count, 0),
    [unreadByOrder],
  );

  useEffect(() => {
    selectedOrderIdRef.current = selectedOrderId;
  }, [selectedOrderId]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const loadUnreadCounts = useCallback(async () => {
    if (!siteId) return;

    const { data, error } = await supabase.rpc("get_staff_order_chat_unread_counts", {
      p_site_id: siteId,
    });

    if (error) {
      console.warn("No se pudieron cargar mensajes pendientes:", error.message);
      return;
    }

    const next: Record<string, number> = {};
    ((data || []) as UnreadRow[]).forEach((row) => {
      next[row.order_id] = Number(row.unread_count || 0);
    });
    setUnreadByOrder(next);
  }, [siteId, supabase]);

  const markRead = useCallback(
    async (conversationId: string, orderId: string) => {
      const { error } = await supabase.rpc("mark_order_conversation_read", {
        p_conversation_id: conversationId,
      });

      if (error) {
        console.warn("No se pudo marcar el chat como leído:", error.message);
        return;
      }

      setUnreadByOrder((current) => ({ ...current, [orderId]: 0 }));
    },
    [supabase],
  );

  useEffect(() => {
    void loadUnreadCounts();
  }, [loadUnreadCounts]);

  useEffect(() => {
    if (!siteId) return;

    const channel = supabase
      .channel(`pulso-order-unread:${siteId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_messages",
          filter: `site_id=eq.${siteId}`,
        },
        (payload) => {
          const message = payload.new as OrderMessageRow;
          if (message.author_type !== "client") return;

          const currentlyReading =
            selectedOrderIdRef.current === message.order_id && activeTabRef.current === "chat";

          if (currentlyReading) {
            void markRead(message.conversation_id, message.order_id);
            return;
          }

          setUnreadByOrder((current) => ({
            ...current,
            [message.order_id]: (current[message.order_id] || 0) + 1,
          }));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "order_conversations",
          filter: `site_id=eq.${siteId}`,
        },
        () => {
          void loadUnreadCounts();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadUnreadCounts, markRead, siteId, supabase]);

  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (billingDetailsOpen) {
        setBillingDetailsOpen(false);
        return;
      }
      setSelectedOrderId(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [billingDetailsOpen, selected]);

  const closeOrderModal = () => {
    setBillingDetailsOpen(false);
    setSelectedOrderId(null);
  };

  const openOrder = (orderId: string) => {
    setBillingDetailsOpen(false);
    setActiveTab("order");
    setSelectedOrderId(orderId);
  };

  const selectTab = (tab: ModalTab) => {
    setActiveTab(tab);
    if (tab === "chat" && selected?.conversation) {
      void markRead(selected.conversation.id, selected.order.id);
    }
  };

  return (
    <>
      {totalUnread > 0 ? (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-cyan-950 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 text-white">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black">
              {totalUnread} mensaje{totalUnread === 1 ? "" : "s"} pendiente{totalUnread === 1 ? "" : "s"}
            </div>
            <div className="text-xs font-semibold text-cyan-700">Las tarjetas resaltadas requieren respuesta.</div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {orders.map((entry) => (
          <OrderCard
            key={entry.order.id}
            data={entry}
            unreadCount={unreadByOrder[entry.order.id] || 0}
            onOpen={() => openOrder(entry.order.id)}
          />
        ))}
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeOrderModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-modal-title"
            className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="order-modal-title" className="text-xl font-black text-slate-950 sm:text-2xl">
                    Pedido #{selected.orderCode}
                  </h2>
                  <span className={selected.statusTone}>{selected.statusLabel}</span>
                  {selected.paymentBlocked ? <span className="ui-chip ui-chip--warn">{selected.paymentLabel}</span> : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span>{formatDate(selected.order.created_at)}</span>
                  <span>{selected.fulfillmentLabel}</span>
                  <span>{selected.sourceLabel}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="hidden text-right sm:block">
                  <div className="text-xl font-black text-slate-950">{formatMoney(selected.order.total_amount)}</div>
                  <div className="text-xs font-semibold text-slate-500">{selected.paymentLabel}</div>
                </div>
                <button
                  type="button"
                  onClick={() => closeOrderModal()}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Cerrar detalle del pedido"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6">
              <div className="flex gap-1 overflow-x-auto py-2">
                {([
                  { id: "order" as const, label: "Pedido", icon: Package },
                  { id: "chat" as const, label: "Chat", icon: MessageCircle },
                  { id: "history" as const, label: "Bitácora", icon: History },
                ]).map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  const chatUnread = tab.id === "chat" ? unreadByOrder[selected.order.id] || 0 : 0;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => selectTab(tab.id)}
                      className={`relative inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${
                        active ? "bg-cyan-500 text-white" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                      {chatUnread > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                          {chatUnread > 99 ? "99+" : chatUnread}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {activeTab === "order" ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                  <div className="space-y-4">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-950">Productos</div>
                          <div className="text-xs text-slate-500">
                            {selected.itemCount || selected.items.length} unidad{(selected.itemCount || selected.items.length) === 1 ? "" : "es"}
                          </div>
                        </div>
                        <div className="text-lg font-black text-slate-950">{formatMoney(selected.order.total_amount)}</div>
                      </div>

                      {selected.items.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">Este pedido no tiene productos visibles.</div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {selected.items.map((item) => (
                            <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900">{item.quantity} × {item.product_name}</div>
                                  <div className="mt-0.5 text-xs text-slate-500">{formatMoney(item.unit_price)} c/u</div>
                                </div>
                                <div className="shrink-0 font-black text-slate-900">{formatMoney(item.total_amount)}</div>
                              </div>

                              {item.options.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {item.options.map((option) => (
                                    <span key={option.id} className="rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800">
                                      {optionEffectLabel(option.effect_type)} · {option.group_name}: {option.option_name}
                                      {option.price_delta_amount > 0 ? ` · +${formatMoney(option.price_delta_amount)}` : ""}
                                    </span>
                                  ))}
                                </div>
                              ) : null}

                              {item.notes ? (
                                <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Nota: {item.notes}</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {selected.order.notes ? (
                      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="text-xs font-black uppercase tracking-wide text-amber-700">Observaciones</div>
                        <div className="mt-1 text-sm font-semibold text-amber-950">{selected.order.notes}</div>
                      </section>
                    ) : null}

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3">
                        <div className="text-sm font-black text-slate-950">Acciones del pedido</div>
                        <div className="text-xs text-slate-500">Avanza el pedido según su estado operativo.</div>
                      </div>

                      {selected.paymentBlocked ? (
                        <div className="ui-alert ui-alert--warn mb-3">Pago pendiente: este domicilio no debe prepararse hasta que Wompi lo confirme.</div>
                      ) : null}

                      <form action={updateOperationalOrderAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="order_id" value={selected.order.id} />
                        <input type="hidden" name="site_id" value={siteId} />
                        <input type="hidden" name="view" value={view} />
                        <input type="hidden" name="fulfillment" value={fulfillment} />
                        {selected.operationButtons.map((button) => (
                          <button
                            key={`${selected.order.id}-${button.op}`}
                            type="submit"
                            name="op"
                            value={button.op}
                            className={`ui-btn h-10 px-4 text-sm ${button.op === "mark_cancelled" ? "ui-btn--danger" : "ui-btn--primary"}`}
                          >
                            <ActionIcon op={button.op} />
                            {button.label}
                          </button>
                        ))}
                      </form>
                    </section>
                  </div>

                  <div className="space-y-4">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="text-sm font-black text-slate-950">Cliente</div>
                      <div className="mt-3 space-y-3">
                        <div className="flex items-start gap-3">
                          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Nombre</div>
                            <div className="text-sm font-bold text-slate-900">{selected.guestName || "Sin nombre"}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Teléfono</div>
                            <div className="text-sm font-bold text-slate-900">{selected.guestPhone || "Sin teléfono"}</div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {selected.billing ? (
                      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                            <div>
                              <div className="text-sm font-black text-violet-950">Facturación electrónica</div>
                              <div className="mt-1 text-xs font-semibold text-violet-700">
                                {billingStatusLabel(selected.billing.status)}
                              </div>
                            </div>
                          </div>
                          <span className={"rounded-full border px-2.5 py-1 text-xs font-black " + billingStatusTone(selected.billing.status)}>
                            {billingStatusLabel(selected.billing.status)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBillingDetailsOpen(true)}
                          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-black text-white transition hover:bg-violet-800"
                        >
                          <ReceiptText className="h-4 w-4" />
                          Datos de facturación
                        </button>
                      </section>
                    ) : null}

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        {selected.order.fulfillment_type === "delivery" ? <Bike className="h-4 w-4 text-cyan-600" /> : <Store className="h-4 w-4 text-cyan-600" />}
                        <div className="text-sm font-black text-slate-950">Entrega</div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Tipo</div><div className="font-bold text-slate-900">{selected.fulfillmentLabel}</div></div>
                        <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Despacho</div><div className="font-bold text-slate-900">{selected.dispatchLabel}</div></div>
                        {selected.order.delivery_zone ? <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Zona</div><div className="font-bold text-slate-900">{selected.order.delivery_zone}</div></div> : null}
                        <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Pago</div><div className="font-bold text-slate-900">{selected.paymentLabel}</div></div>
                      </div>

                      {selected.order.fulfillment_type === "delivery" ? (
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Dirección</div>
                          <div className="mt-1 text-sm font-semibold leading-6 text-slate-800">{selected.fullAddress || "Sin dirección cargada"}</div>
                          {selected.mapsHref ? (
                            <a href={selected.mapsHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                              <MapPin className="h-4 w-4" /> Abrir en Google Maps
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </section>

                    {selected.order.fulfillment_type === "delivery" ? (
                      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-cyan-600" /><div className="text-sm font-black text-slate-950">Domiciliario</div></div>
                        <div className="mt-2 text-xs text-slate-500">Actual: {selected.order.dispatch_partner || "Sin asignar"}{selected.order.dispatch_reference ? ` · ${selected.order.dispatch_reference}` : ""}</div>
                        {selected.order.status !== "delivered" && selected.order.status !== "cancelled" ? (
                          <form action={assignDispatchOrderAction} className="mt-3 space-y-2">
                            <input type="hidden" name="order_id" value={selected.order.id} />
                            <input type="hidden" name="site_id" value={siteId} />
                            <input type="hidden" name="view" value={view} />
                            <input type="hidden" name="fulfillment" value={fulfillment} />
                            <input className="ui-input" name="dispatch_partner" defaultValue={selected.order.dispatch_partner ?? ""} placeholder="Aliado o domiciliario" />
                            <input className="ui-input" name="dispatch_reference" defaultValue={selected.order.dispatch_reference ?? ""} placeholder="Referencia de despacho" />
                            <button type="submit" className="ui-btn ui-btn--brand h-10 w-full px-4 text-sm"><Truck className="h-4 w-4" />Guardar asignación</button>
                          </form>
                        ) : null}
                      </section>
                    ) : null}

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-cyan-600" /><div className="text-sm font-black text-slate-950">Resumen</div></div>
                      <div className="mt-3 flex items-center justify-between gap-4"><div className="text-sm font-semibold text-slate-500">Total del pedido</div><div className="text-xl font-black text-slate-950">{formatMoney(selected.order.total_amount)}</div></div>
                    </section>
                  </div>
                </div>
              ) : null}

              {activeTab === "chat" ? (
                <div className="mx-auto max-w-3xl">
                  <OrderChatLive
                    conversation={selected.conversation}
                    initialMessages={selected.messages}
                    orderId={selected.order.id}
                    orderStatus={selected.order.status}
                    siteId={siteId}
                    sendMessageAction={sendOrderMessageLiveAction}
                  />
                </div>
              ) : null}

              {activeTab === "history" ? (
                <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div><div className="text-sm font-black text-slate-950">Bitácora del pedido</div><div className="text-xs text-slate-500">Cambios de estado y asignaciones registradas.</div></div>
                    <span className="ui-chip">{selected.events.length} evento{selected.events.length === 1 ? "" : "s"}</span>
                  </div>
                  {selected.events.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Sin eventos registrados.</div>
                  ) : (
                    <div className="space-y-3">
                      {selected.events.map((event) => (
                        <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-2"><div className="font-bold text-slate-900">{event.operation}</div><div className="text-xs text-slate-500">{formatDate(event.created_at)}</div></div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{event.actor_name}</div>
                          {event.from_status || event.to_status ? <div className="mt-2 text-sm text-slate-700">Estado: {statusTransitionLabel(event.from_status)} → {statusTransitionLabel(event.to_status)}</div> : null}
                          {event.from_dispatch_status || event.to_dispatch_status ? <div className="mt-1 text-sm text-slate-700">Despacho: {dispatchTransitionLabel(event.from_dispatch_status)} → {dispatchTransitionLabel(event.to_dispatch_status)}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {selectedBilling && billingDetailsOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setBillingDetailsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-modal-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="billing-modal-title" className="text-lg font-black text-slate-950">Datos de facturación</h3>
                  <div className="mt-1 text-sm text-slate-500">Pedido #{selected?.orderCode}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBillingDetailsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                aria-label="Cerrar datos de facturación"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-bold text-slate-600">Estado</div>
                <span className={"rounded-full border px-2.5 py-1 text-xs font-black " + billingStatusTone(selectedBilling.status)}>
                  {billingStatusLabel(selectedBilling.status)}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">Nombre o razón social</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{selectedBilling.legal_name}</div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">Identificación</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {selectedBilling.document_type} {selectedBilling.document_number}
                    {selectedBilling.verification_digit ? "-" + selectedBilling.verification_digit : ""}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">Correo</div>
                  <div className="mt-1 break-all text-sm font-bold text-slate-900">{selectedBilling.billing_email}</div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">Solicitada</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{formatDate(selectedBilling.requested_at)}</div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">Proveedor</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{selectedBilling.provider || "Pendiente de integración"}</div>
                </div>
              </div>

              {selectedBilling.invoice_number || selectedBilling.cufe ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  {selectedBilling.invoice_number ? (
                    <div className="text-sm font-bold text-emerald-900">Factura: {selectedBilling.invoice_number}</div>
                  ) : null}
                  {selectedBilling.cufe ? (
                    <div className="mt-1 break-all text-xs font-semibold text-emerald-700">CUFE: {selectedBilling.cufe}</div>
                  ) : null}
                </div>
              ) : null}

              {selectedBilling.error_message ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  Error: {selectedBilling.error_message}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
