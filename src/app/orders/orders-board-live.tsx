"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { OrdersBoard as DecoratedOrdersBoard } from "./orders-board";

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
  status: string | null;
  payment_status: string | null;
  fulfillment_type: string | null;
  dispatch_status: string | null;
  dispatch_partner: string | null;
  dispatch_reference: string | null;
  [key: string]: unknown;
};

type OperationButton = {
  op: OpsAction;
  label: string;
};

type OrderEntry = {
  order: OrderRow;
  statusLabel: string;
  statusTone: string;
  paymentLabel: string;
  dispatchLabel: string;
  paymentBlocked: boolean;
  operationButtons: OperationButton[];
  [key: string]: unknown;
};

type LiveOrderPatch = {
  id: string;
  status: string | null;
  payment_status: string | null;
  fulfillment_type: string | null;
  dispatch_status: string | null;
  dispatch_partner: string | null;
  dispatch_reference: string | null;
};

type OrdersBoardLiveProps = {
  orders: OrderEntry[];
  siteId: string;
  view: ViewFilter;
  fulfillment: FulfillmentFilter;
  updateOperationalOrderAction: (...args: any[]) => any;
  assignDispatchOrderAction: (...args: any[]) => any;
  sendOrderMessageLiveAction: (...args: any[]) => any;
};

const ACTIVE_STATUSES = new Set([
  "pending",
  "confirmed",
  "preparing",
  "ready_for_dispatch",
  "in_transit",
  "on_the_way",
]);

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  ready_for_dispatch: "Listo despacho",
  in_transit: "En camino",
  on_the_way: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_TONES: Record<string, string> = {
  pending: "ui-chip ui-chip--warn",
  confirmed: "ui-chip ui-chip--brand",
  preparing: "ui-chip ui-chip--warn",
  ready_for_dispatch: "ui-chip ui-chip--brand",
  in_transit: "ui-chip ui-chip--brand",
  on_the_way: "ui-chip ui-chip--brand",
  delivered: "ui-chip ui-chip--success",
  cancelled: "ui-chip",
};

const PAYMENT_LABELS: Record<string, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  pending_payment: "Pendiente de pago",
  unpaid: "Sin pagar",
  failed: "Fallido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  not_required: "No requiere pago",
};

const DISPATCH_LABELS: Record<string, string> = {
  not_required: "No requiere despacho",
  pending: "Pendiente",
  assigned: "Asignado",
  ready_for_dispatch: "Listo para despacho",
  in_transit: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

function formatPaymentLabel(order: OrderRow) {
  if (order.fulfillment_type === "pickup") {
    return order.payment_status === "paid" ? "Pagado" : "Pago al recoger";
  }
  if (order.fulfillment_type === "on_premise") {
    return order.payment_status === "paid" ? "Pagado" : "Pago en sede";
  }
  if (!order.payment_status) return "Sin pagar";
  return PAYMENT_LABELS[order.payment_status] || order.payment_status;
}

function requiresPayment(order: OrderRow) {
  if (order.status === "cancelled") return false;
  return order.fulfillment_type === "delivery" && order.payment_status !== "paid";
}

function buildOperationButtons(order: OrderRow): OperationButton[] {
  const status = order.status || "pending";
  const buttons: OperationButton[] = [];

  if (requiresPayment(order)) {
    return [{ op: "mark_cancelled", label: "Cancelar" }];
  }
  if (status === "pending" || status === "confirmed") {
    buttons.push({ op: "mark_preparing", label: "Preparando" });
  }
  if (status === "preparing") {
    buttons.push({ op: "mark_ready", label: "Listo despacho" });
  }
  if (status === "ready_for_dispatch" && order.fulfillment_type === "delivery") {
    buttons.push({ op: "mark_in_transit", label: "En camino" });
  }
  if (status === "ready_for_dispatch" && order.fulfillment_type !== "delivery") {
    buttons.push({ op: "mark_delivered", label: "Entregado" });
  }
  if (status === "in_transit" || status === "on_the_way") {
    buttons.push({ op: "mark_delivered", label: "Entregado" });
  }
  if (status !== "delivered" && status !== "cancelled") {
    buttons.push({ op: "mark_cancelled", label: "Cancelar" });
  }

  return buttons;
}

function matchesCurrentView(
  order: Pick<OrderRow, "status" | "fulfillment_type">,
  view: ViewFilter,
  fulfillment: FulfillmentFilter,
) {
  if (fulfillment !== "all" && order.fulfillment_type !== fulfillment) return false;
  if (view === "active") return ACTIVE_STATUSES.has(order.status || "");
  if (view === "delivered") return order.status === "delivered";
  if (view === "cancelled") return order.status === "cancelled";
  return true;
}

function updateEntry(entry: OrderEntry, patch: LiveOrderPatch): OrderEntry {
  const order: OrderRow = { ...entry.order, ...patch };
  const status = order.status || "pending";

  return {
    ...entry,
    order,
    statusLabel: STATUS_LABELS[status] || status,
    statusTone: STATUS_TONES[status] || "ui-chip",
    paymentLabel: formatPaymentLabel(order),
    dispatchLabel: order.dispatch_status
      ? DISPATCH_LABELS[order.dispatch_status] || order.dispatch_status
      : "No requiere despacho",
    paymentBlocked: requiresPayment(order),
    operationButtons: buildOperationButtons(order),
  };
}

export function OrdersBoardLive(props: OrdersBoardLiveProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<OrderEntry[]>(props.orders);
  const ordersRef = useRef<OrderEntry[]>(props.orders);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setOrders(props.orders);
    ordersRef.current = props.orders;
  }, [props.orders]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const scheduleFullRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) return;
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, 450);
  }, [router]);

  const applyLivePatch = useCallback(
    (patch: LiveOrderPatch) => {
      const exists = ordersRef.current.some((entry) => entry.order.id === patch.id);
      if (!exists) {
        if (matchesCurrentView(patch, props.view, props.fulfillment)) scheduleFullRefresh();
        return;
      }

      setOrders((current) =>
        current
          .map((entry) => (entry.order.id === patch.id ? updateEntry(entry, patch) : entry))
          .filter((entry) => matchesCurrentView(entry.order, props.view, props.fulfillment)),
      );
    },
    [props.fulfillment, props.view, scheduleFullRefresh],
  );

  const syncVisibleOrders = useCallback(async () => {
    const ids = ordersRef.current.map((entry) => entry.order.id);
    if (ids.length === 0) return;

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,status,payment_status,fulfillment_type,dispatch_status,dispatch_partner,dispatch_reference",
      )
      .in("id", ids);

    if (error) {
      console.warn("No se pudieron sincronizar los estados de pedidos:", error.message);
      return;
    }

    for (const row of (data || []) as LiveOrderPatch[]) applyLivePatch(row);
  }, [applyLivePatch, supabase]);

  useEffect(() => {
    if (!props.siteId) return;

    const channel = supabase
      .channel(`pulso-orders-local:${props.siteId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `site_id=eq.${props.siteId}`,
        },
        (payload) => applyLivePatch(payload.new as LiveOrderPatch),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `site_id=eq.${props.siteId}`,
        },
        () => scheduleFullRefresh(),
      )
      .subscribe();

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void syncVisibleOrders();
    };
    const syncWhenOnline = () => void syncVisibleOrders();

    window.addEventListener("focus", syncWhenOnline);
    window.addEventListener("online", syncWhenOnline);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
      window.removeEventListener("focus", syncWhenOnline);
      window.removeEventListener("online", syncWhenOnline);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [applyLivePatch, props.siteId, scheduleFullRefresh, supabase, syncVisibleOrders]);

  return <DecoratedOrdersBoard {...(props as any)} orders={orders as any} />;
}
