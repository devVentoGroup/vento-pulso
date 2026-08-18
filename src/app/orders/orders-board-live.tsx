"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { OrdersBoard as DecoratedOrdersBoard } from "./orders-board";

type DecoratedOrdersBoardProps = ComponentProps<typeof DecoratedOrdersBoard>;
type OrdersBoardLiveProps = DecoratedOrdersBoardProps;
type OrderEntry = OrdersBoardLiveProps["orders"][number];
type OrderRow = OrderEntry["order"];
type ViewFilter = OrdersBoardLiveProps["view"];
type FulfillmentFilter = OrdersBoardLiveProps["fulfillment"];

type OpsAction =
  | "mark_preparing"
  | "mark_ready"
  | "mark_in_transit"
  | "mark_delivered"
  | "mark_cancelled";
type GiftOperation =
  | "mark_card_prepared"
  | "mark_card_included"
  | "mark_price_free_packaging_confirmed";

type OperationButton = {
  op: OpsAction;
  label: string;
};

type OrderStatusEvent = {
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

type LiveOrderPatch = {
  id: string;
  status: string | null;
  payment_status: string | null;
  fulfillment_type: string | null;
  dispatch_status: string | null;
  dispatch_partner: string | null;
  dispatch_reference: string | null;
};

type RawStatusEvent = {
  id: string;
  order_id: string;
  changed_by: string | null;
  actor_type: string | null;
  operation: string | null;
  from_status: string | null;
  to_status: string | null;
  from_dispatch_status: string | null;
  to_dispatch_status: string | null;
  dispatch_partner: string | null;
  dispatch_reference: string | null;
  created_at: string;
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

function updateEntry(entry: OrderEntry, patch: Partial<LiveOrderPatch>): OrderEntry {
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

function operationPatch(order: OrderRow, operation: OpsAction): Partial<LiveOrderPatch> {
  if (operation === "mark_preparing") return { status: "preparing" };
  if (operation === "mark_ready") {
    return {
      status: "ready_for_dispatch",
      dispatch_status:
        order.fulfillment_type === "delivery" ? "ready_for_dispatch" : order.dispatch_status,
    };
  }
  if (operation === "mark_in_transit") {
    return { status: "in_transit", dispatch_status: "in_transit" };
  }
  if (operation === "mark_delivered") {
    return {
      status: "delivered",
      dispatch_status: order.fulfillment_type === "delivery" ? "delivered" : order.dispatch_status,
    };
  }
  return {
    status: "cancelled",
    dispatch_status: order.fulfillment_type === "delivery" ? "cancelled" : order.dispatch_status,
  };
}

function operationLabel(operation: string | null) {
  const labels: Record<string, string> = {
    mark_preparing: "Preparando",
    mark_ready: "Listo para despacho",
    mark_in_transit: "En camino",
    mark_delivered: "Entregado",
    mark_cancelled: "Cancelado",
    assign_dispatch: "Domiciliario asignado",
    mark_card_prepared: "Tarjeta preparada",
    mark_card_included: "Tarjeta incluida en el pedido",
    mark_price_free_packaging_confirmed: "Empaque sin precios confirmado",
  };
  return operation ? labels[operation] || operation : "Actualización";
}

function toLiveEvent(row: RawStatusEvent): OrderStatusEvent {
  return {
    id: row.id,
    order_id: row.order_id,
    changed_by: row.changed_by,
    actor_name: row.actor_type === "system" ? "Sistema" : "Equipo",
    actor_type: row.actor_type,
    operation: operationLabel(row.operation),
    from_status: row.from_status,
    to_status: row.to_status,
    from_dispatch_status: row.from_dispatch_status,
    to_dispatch_status: row.to_dispatch_status,
    dispatch_partner: row.dispatch_partner,
    dispatch_reference: row.dispatch_reference,
    created_at: row.created_at,
  };
}

function updateHeaderCounter(label: string, value: number) {
  for (const node of Array.from(document.querySelectorAll("div"))) {
    if (node.textContent?.trim() !== label) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    const valueNode = Array.from(parent.children).find(
      (child) => child !== node && child instanceof HTMLElement,
    );
    if (valueNode instanceof HTMLElement) valueNode.textContent = String(value);
    return;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function patchGiftEntry(entry: OrderEntry, operation: GiftOperation): OrderEntry {
  const guestInfo = asRecord(entry.order.guest_info);
  const gift = asRecord(guestInfo.gift);
  const now = new Date().toISOString();

  if (operation === "mark_card_prepared") {
    gift.card_status = "prepared";
    gift.card_prepared_at = now;
  } else if (operation === "mark_card_included") {
    gift.card_status = "included";
    gift.card_included_at = now;
  } else {
    gift.price_free_packaging_confirmed_at = now;
  }

  return {
    ...entry,
    order: {
      ...entry.order,
      guest_info: {
        ...guestInfo,
        gift,
      },
    },
  };
}

function giftOperationFromButton(button: HTMLButtonElement): GiftOperation | null {
  const text = button.textContent || "";
  if (text.includes("Tarjeta preparada")) return "mark_card_prepared";
  if (text.includes("Tarjeta incluida en el pedido")) return "mark_card_included";
  if (text.includes("Empaque confirmado sin precios")) {
    return "mark_price_free_packaging_confirmed";
  }
  return null;
}

export function OrdersBoardLive(props: OrdersBoardLiveProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<OrderEntry[]>(props.orders);
  const [operationError, setOperationError] = useState<string | null>(null);
  const ordersRef = useRef<OrderEntry[]>(props.orders);
  const refreshTimerRef = useRef<number | null>(null);
  const operationInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    ordersRef.current = props.orders;

    const syncTimer = window.setTimeout(() => {
      setOrders(props.orders);
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [props.orders]);

  useEffect(() => {
    ordersRef.current = orders;

    const activeCount = orders.filter((entry) =>
      ACTIVE_STATUSES.has(entry.order.status || ""),
    ).length;
    const readyCount = orders.filter(
      (entry) =>
        entry.order.fulfillment_type === "delivery" &&
        entry.order.status === "ready_for_dispatch",
    ).length;

    updateHeaderCounter("Activos", activeCount);
    updateHeaderCounter("Listos", readyCount);
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

  const addLiveEvent = useCallback((row: RawStatusEvent) => {
    const event = toLiveEvent(row);
    setOrders((current) =>
      current.map((entry) => {
        if (entry.order.id !== event.order_id) return entry;
        if (entry.events.some((candidate) => candidate.id === event.id)) return entry;
        return {
          ...entry,
          events: [
            event,
            ...entry.events.filter((candidate) => !candidate.id.startsWith("optimistic-")),
          ],
        };
      }),
    );
  }, []);

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

  const runOptimisticOperation = useCallback(
    async (orderId: string, operation: OpsAction, submitter: HTMLButtonElement | null) => {
      if (operationInFlightRef.current.has(orderId)) return;
      const currentEntry = ordersRef.current.find((entry) => entry.order.id === orderId);
      if (!currentEntry) return;

      operationInFlightRef.current.add(orderId);
      setOperationError(null);
      if (submitter) submitter.disabled = true;

      const snapshot = ordersRef.current;
      const patch = operationPatch(currentEntry.order, operation);
      const optimisticEvent: OrderStatusEvent = {
        id: `optimistic-${orderId}-${Date.now()}`,
        order_id: orderId,
        changed_by: null,
        actor_name: "Equipo · guardando",
        actor_type: "staff",
        operation: operationLabel(operation),
        from_status: currentEntry.order.status,
        to_status: typeof patch.status === "string" ? patch.status : currentEntry.order.status,
        from_dispatch_status: currentEntry.order.dispatch_status,
        to_dispatch_status:
          typeof patch.dispatch_status === "string"
            ? patch.dispatch_status
            : currentEntry.order.dispatch_status,
        dispatch_partner: currentEntry.order.dispatch_partner,
        dispatch_reference: currentEntry.order.dispatch_reference,
        created_at: new Date().toISOString(),
      };

      setOrders((current) =>
        current
          .map((entry) =>
            entry.order.id === orderId
              ? {
                ...updateEntry(entry, patch),
                events: [optimisticEvent, ...entry.events],
              }
              : entry,
          )
          .filter((entry) => matchesCurrentView(entry.order, props.view, props.fulfillment)),
      );

      const { data, error } = await supabase.rpc("update_order_operational_state", {
        p_order_id: orderId,
        p_site_id: props.siteId,
        p_operation: operation,
        p_metadata: { source: "pulso_orders_board_live" },
      });

      const ok = !error && Boolean((data as { ok?: boolean } | null)?.ok);
      if (!ok) {
        setOrders(snapshot);
        setOperationError(error?.message || "No pudimos actualizar el pedido.");
      }

      operationInFlightRef.current.delete(orderId);
      if (submitter) submitter.disabled = false;
    },
    [props.fulfillment, props.siteId, props.view, supabase],
  );

  const runOptimisticDispatch = useCallback(
    async (
      orderId: string,
      dispatchPartner: string,
      dispatchReference: string,
      submitter: HTMLButtonElement | null,
    ) => {
      if (operationInFlightRef.current.has(orderId)) return;
      if (!dispatchPartner && !dispatchReference) {
        setOperationError("Ingresa aliado o referencia para asignar domicilio.");
        return;
      }

      const currentEntry = ordersRef.current.find((entry) => entry.order.id === orderId);
      if (!currentEntry) return;

      operationInFlightRef.current.add(orderId);
      setOperationError(null);
      if (submitter) submitter.disabled = true;
      const snapshot = ordersRef.current;

      setOrders((current) =>
        current.map((entry) =>
          entry.order.id === orderId
            ? updateEntry(entry, {
              dispatch_status: "assigned",
              dispatch_partner: dispatchPartner || null,
              dispatch_reference: dispatchReference || null,
            })
            : entry,
        ),
      );

      const { data, error } = await supabase.rpc("update_order_operational_state", {
        p_order_id: orderId,
        p_site_id: props.siteId,
        p_operation: "assign_dispatch",
        p_dispatch_partner: dispatchPartner || null,
        p_dispatch_reference: dispatchReference || null,
        p_metadata: { source: "pulso_orders_board_live" },
      });

      const ok = !error && Boolean((data as { ok?: boolean } | null)?.ok);
      if (!ok) {
        setOrders(snapshot);
        setOperationError(error?.message || "No pudimos asignar el domiciliario.");
      }

      operationInFlightRef.current.delete(orderId);
      if (submitter) submitter.disabled = false;
    },
    [props.siteId, supabase],
  );

  const runOptimisticGiftOperation = useCallback(
    async (orderId: string, operation: GiftOperation, button: HTMLButtonElement) => {
      if (operationInFlightRef.current.has(orderId)) return;
      if (!ordersRef.current.some((entry) => entry.order.id === orderId)) return;

      operationInFlightRef.current.add(orderId);
      setOperationError(null);
      button.disabled = true;
      const snapshot = ordersRef.current;

      setOrders((current) =>
        current.map((entry) =>
          entry.order.id === orderId ? patchGiftEntry(entry, operation) : entry,
        ),
      );

      const { data, error } = await supabase.rpc("update_order_gift_operational_state", {
        p_order_id: orderId,
        p_site_id: props.siteId,
        p_operation: operation,
        p_metadata: { source: "pulso_orders_board_live" },
      });

      const ok = !error && (data == null || Boolean((data as { ok?: boolean }).ok ?? true));
      if (!ok) {
        setOrders(snapshot);
        const messages: Record<string, string> = {
          card_must_be_prepared_first: "Primero debes marcar la tarjeta como preparada.",
          card_not_requested: "Este regalo no solicitó tarjeta.",
          permission_denied: "No tienes permiso para actualizar este checklist.",
          order_not_found: "No se encontró el pedido.",
        };
        setOperationError(messages[error?.message || ""] || error?.message || "No pudimos actualizar el checklist.");
      }

      operationInFlightRef.current.delete(orderId);
      button.disabled = false;
    },
    [props.siteId, supabase],
  );

  const handleSubmitCapture = useCallback(
    (event: FormEvent<HTMLDivElement>) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const nativeEvent = event.nativeEvent as SubmitEvent;
      const submitter = nativeEvent.submitter;
      const submitButton = submitter instanceof HTMLButtonElement ? submitter : null;
      const formData = new FormData(form);
      const orderId = String(formData.get("order_id") || "");
      if (!orderId) return;

      if (formData.has("dispatch_partner") || formData.has("dispatch_reference")) {
        event.preventDefault();
        event.stopPropagation();
        void runOptimisticDispatch(
          orderId,
          String(formData.get("dispatch_partner") || "").trim(),
          String(formData.get("dispatch_reference") || "").trim(),
          submitButton,
        );
        return;
      }

      if (!submitButton || submitButton.name !== "op") return;
      const operation = submitButton.value as OpsAction;
      if (!buildOperationButtons({
        ...(ordersRef.current.find((entry) => entry.order.id === orderId)?.order || {}),
      } as OrderRow).some((button) => button.op === operation)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void runOptimisticOperation(orderId, operation, submitButton);
    },
    [runOptimisticDispatch, runOptimisticOperation],
  );

  const handleClickCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (!(button instanceof HTMLButtonElement)) return;
      const operation = giftOperationFromButton(button);
      if (!operation) return;

      const dialog = button.closest('[role="dialog"]');
      const orderInput = dialog?.querySelector('input[name="order_id"]');
      if (!(orderInput instanceof HTMLInputElement) || !orderInput.value) return;

      event.preventDefault();
      event.stopPropagation();
      void runOptimisticGiftOperation(orderInput.value, operation, button);
    },
    [runOptimisticGiftOperation],
  );

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
          event: "INSERT",
          schema: "public",
          table: "order_status_events",
        },
        (payload) => addLiveEvent(payload.new as RawStatusEvent),
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
  }, [
    addLiveEvent,
    applyLivePatch,
    props.siteId,
    scheduleFullRefresh,
    supabase,
    syncVisibleOrders,
  ]);

  return (
    <div onSubmitCapture={handleSubmitCapture} onClickCapture={handleClickCapture}>
      {operationError ? (
        <div className="ui-alert ui-alert--error mb-3">
          {operationError}
          <button
            type="button"
            onClick={() => setOperationError(null)}
            className="ml-2 font-black underline"
          >
            Cerrar
          </button>
        </div>
      ) : null}
      <DecoratedOrdersBoard {...props} orders={orders} />
    </div>
  );
}