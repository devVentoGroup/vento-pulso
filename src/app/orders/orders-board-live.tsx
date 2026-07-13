"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { OrdersBoard as DecoratedOrdersBoard } from "./orders-board";

type OrdersBoardProps = ComponentProps<typeof DecoratedOrdersBoard>;
type OrderEntry = OrdersBoardProps["orders"][number];
type OrderRow = OrderEntry["order"];
type OperationButton = OrderEntry["operationButtons"][number];

type LiveOrderPatch = Pick<
  OrderRow,
  | "id"
  | "status"
  | "payment_status"
  | "fulfillment_type"
  | "dispatch_status"
  | "dispatch_partner"
  | "dispatch_reference"
>;

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

function paymentLabel(order: OrderRow) {
  if (order.fulfillment_type === "pickup") {
    return order.payment_status === "paid" ? "Pagado" : "Pago al recoger";
  }

  if (order.fulfillment_type === "on_premise") {
    return order.payment_status === "paid" ? "Pagado" : "Pago en sede";
  }

  if (!order.payment_status) return "Sin pagar";
  return PAYMENT_LABELS[order.payment_status] || order.payment_status;
}

function paymentBlocked(order: OrderRow) {
  if (order.status === "cancelled") return false;
  return order.fulfillment_type === "delivery" && order.payment_status !== "paid";
}

function operationButtons(order: OrderRow): OperationButton[] {
  const status = order.status || "pending";
  const buttons: OperationButton[] = [];

  if (paymentBlocked(order)) {
    buttons.push({ op: "mark_cancelled", label: "Cancelar" });
    return buttons;
  }

  if (status === "pending" || status === "confirmed") {
    buttons.push({ op: "mark_preparing", label: "Preparando" });
  }

  if (status === "preparing") {
    buttons.push({ op: "mark_ready", label: "Listo despacho" });
  }

  if (order.fulfillment_type === "delivery" && status === "ready_for_dispatch") {
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

function matchesView(
  order: Pick<OrderRow, "status" | "fulfillment_type">,
  view: OrdersBoardProps["view"],
  fulfillment: OrdersBoardProps["fulfillment"],
) {
  if (fulfillment !== "all" && order.fulfillment_type !== fulfillment) return false;

  if (view === "active") return ACTIVE_STATUSES.has(order.status || "");
  if (view === "delivered") return order.status === "delivered";
  if (view === "cancelled") return order.status === "cancelled";
  return true;
}

function applyPatch(entry: OrderEntry, patch: LiveOrderPatch): OrderEntry {
  const nextOrder = { ...entry.order, ...patch };
  const statusKey = nextOrder.status || "pending";

  return {
    ...entry,
    order: nextOrder,
    statusLabel: STATUS_LABELS[statusKey] || statusKey,
    statusTone: STATUS_TONES[statusKey] || "ui-chip",
    paymentLabel: paymentLabel(nextOrder),
    dispatchLabel: nextOrder.dispatch_status
      ? DISPATCH_LABELS[nextOrder.dispatch_status] || nextOrder.dispatch_status
      : "No requiere despacho",
    paymentBlocked: paymentBlocked(nextOrder),
    operationButtons: operationButtons(nextOrder),
  };
}

export function OrdersBoardLive(props: OrdersBoardProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<OrderEntry[]>(props.orders);
  const ordersRef = useRef<OrderEntry[]>(props.orders);
  const refreshTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    setOrders(props.orders);
    ordersRef.current = props.orders;
  }, [props.orders]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const scheduleFullRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, 450);
  }, [router]);

  const applyLivePatch = useCallback(
    (patch: LiveOrderPatch) => {
      const exists = ordersRef.current.some((entry) => entry.order.id === patch.id);

      if (!exists) {
        if (matchesView(patch, props.view, props.fulfillment)) scheduleFullRefresh();
        return;
      }

      setOrders((current) =>
        current
          .map((entry) => (entry.order.id === patch.id ? applyPatch(entry, patch) : entry))
          .filter((entry) => matchesView(entry.order, props.view, props.fulfillment)),
      );
    },
    [props.fulfillment, props.view, scheduleFullRefresh],
  );

  const syncKnownOrders = useCallback(async () => {
    const ids = ordersRef.current.map((entry) => entry.order.id);
    if (!ids.length) return;

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

    ((data || []) as LiveOrderPatch[]).forEach(applyLivePatch);
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
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string }).id;
          if (!deletedId) return;
          setOrders((current) => current.filter((entry) => entry.order.id !== deletedId));
        },
      )
      .subscribe();

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void syncKnownOrders();
    };
    const syncWhenOnline = () => void syncKnownOrders();

    window.addEventListener("focus", syncWhenOnline);
    window.addEventListener("online", syncWhenOnline);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      window.removeEventListener("focus", syncWhenOnline);
      window.removeEventListener("online", syncWhenOnline);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [applyLivePatch, props.siteId, scheduleFullRefresh, supabase, syncKnownOrders]);

  return <DecoratedOrdersBoard {...props} orders={orders} />;
}
