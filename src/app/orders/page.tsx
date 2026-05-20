import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bike,
  CheckCircle2,
  Clock3,
  PackageCheck,
  RefreshCw,
  Store,
  XCircle,
} from "lucide-react";

import { requireAppAccess } from "@/lib/auth/guard";

type PageSearchParams = {
  site_id?: string;
  view?: string;
  fulfillment?: string;
  message?: string;
  error?: string;
};

type ViewFilter = "active" | "delivered" | "cancelled" | "all";
type FulfillmentFilter = "all" | "delivery" | "pickup" | "on_premise";
type OpsAction =
  | "mark_preparing"
  | "mark_ready"
  | "mark_in_transit"
  | "mark_delivered"
  | "mark_cancelled";

type OrderOpsRow = {
  id: string;
  site_id: string | null;
  fulfillment_type: string | null;
  status: string | null;
};

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

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  total_amount: number | string | null;
  notes: string | null;
};

type ProductRow = {
  id: string;
  name: string | null;
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
};

type OrderStatusEventRow = {
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
  metadata: Record<string, unknown> | null;
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

type EmployeeRow = {
  id: string;
  alias: string | null;
  full_name: string | null;
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

const VALID_VIEW: ViewFilter[] = ["active", "delivered", "cancelled", "all"];
const VALID_FULFILLMENT: FulfillmentFilter[] = ["all", "delivery", "pickup", "on_premise"];
const VALID_OPS: OpsAction[] = [
  "mark_preparing",
  "mark_ready",
  "mark_in_transit",
  "mark_delivered",
  "mark_cancelled",
];
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const STATUS_TONE: Record<string, string> = {
  pending: "ui-chip ui-chip--warn",
  confirmed: "ui-chip ui-chip--brand",
  preparing: "ui-chip ui-chip--warn",
  ready_for_dispatch: "ui-chip ui-chip--brand",
  in_transit: "ui-chip ui-chip--brand",
  on_the_way: "ui-chip ui-chip--brand",
  delivered: "ui-chip ui-chip--success",
  cancelled: "ui-chip",
};

function asViewFilter(value: string | undefined): ViewFilter {
  if (value && VALID_VIEW.includes(value as ViewFilter)) return value as ViewFilter;
  return "active";
}

function asFulfillmentFilter(value: string | undefined): FulfillmentFilter {
  if (value && VALID_FULFILLMENT.includes(value as FulfillmentFilter)) return value as FulfillmentFilter;
  return "all";
}

function readFormString(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function parseMoney(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function buildOrdersHref(params: {
  siteId?: string | null;
  view?: ViewFilter;
  fulfillment?: FulfillmentFilter;
  message?: string;
  error?: string;
}) {
  const qp = new URLSearchParams();
  if (params.siteId) qp.set("site_id", params.siteId);
  if (params.view && params.view !== "active") qp.set("view", params.view);
  if (params.fulfillment && params.fulfillment !== "all") qp.set("fulfillment", params.fulfillment);
  if (params.message) qp.set("message", params.message);
  if (params.error) qp.set("error", params.error);
  const query = qp.toString();
  return query ? `/orders?${query}` : "/orders";
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatMoney(value: number | string | null) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(parseMoney(value));
}

function extractText(
  obj: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  if (!obj) return null;
  const value = obj[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatAddress(deliveryAddress: Record<string, unknown> | null) {
  if (!deliveryAddress) return null;
  const line1 = extractText(deliveryAddress, "line1");
  const reference = extractText(deliveryAddress, "reference");
  if (!line1 && !reference) return null;
  if (line1 && reference) return `${line1} · ${reference}`;
  return line1 || reference;
}

function canMoveToInTransit(order: OrderRow) {
  return order.fulfillment_type === "delivery" && order.status === "ready_for_dispatch";
}

function actionButtons(order: OrderRow) {
  const status = order.status || "pending";
  const buttons: { op: OpsAction; label: string }[] = [];
  const paymentStatus = order.payment_status || "unpaid";

  if (paymentStatus !== "paid" && status !== "cancelled") {
    buttons.push({ op: "mark_cancelled", label: "Cancelar" });
    return buttons;
  }

  if (status === "pending" || status === "confirmed") {
    buttons.push({ op: "mark_preparing", label: "Preparando" });
  }

  if (status === "preparing") {
    buttons.push({ op: "mark_ready", label: "Listo despacho" });
  }

  if (canMoveToInTransit(order)) {
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

function mapOrderItems(
  rawItems: OrderItemRow[],
  productsById: Map<string, string>
): Record<string, OrderItemView[]> {
  const byOrder: Record<string, OrderItemView[]> = {};

  rawItems.forEach((item) => {
    const next: OrderItemView = {
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      product_name: productsById.get(item.product_id) || `Producto ${item.product_id.slice(0, 8)}`,
      quantity: parseMoney(item.quantity),
      unit_price: parseMoney(item.unit_price),
      total_amount: parseMoney(item.total_amount),
      notes: item.notes,
    };

    if (!byOrder[item.order_id]) {
      byOrder[item.order_id] = [next];
      return;
    }

    byOrder[item.order_id].push(next);
  });

  return byOrder;
}

function formatOperationLabel(operation: string) {
  if (operation === "mark_preparing") return "Preparando";
  if (operation === "mark_ready") return "Listo para despacho";
  if (operation === "mark_in_transit") return "En camino";
  if (operation === "mark_delivered") return "Entregado";
  if (operation === "mark_cancelled") return "Cancelado";
  if (operation === "assign_dispatch") return "Domiciliario asignado";
  return operation;
}

function mapOrderEvents(
  rawEvents: OrderStatusEventRow[],
  actorNameById: Map<string, string>
): Record<string, OrderStatusEventView[]> {
  const byOrder: Record<string, OrderStatusEventView[]> = {};

  rawEvents.forEach((event) => {
    const actorName = event.changed_by
      ? actorNameById.get(event.changed_by) || `Staff ${event.changed_by.slice(0, 8)}`
      : event.actor_type === "system"
      ? "Sistema"
      : "Staff";

    const next: OrderStatusEventView = {
      id: event.id,
      order_id: event.order_id,
      changed_by: event.changed_by,
      actor_name: actorName,
      actor_type: event.actor_type,
      operation: formatOperationLabel(event.operation || "actualización"),
      from_status: event.from_status,
      to_status: event.to_status,
      from_dispatch_status: event.from_dispatch_status,
      to_dispatch_status: event.to_dispatch_status,
      dispatch_partner: event.dispatch_partner,
      dispatch_reference: event.dispatch_reference,
      created_at: event.created_at,
    };

    if (!byOrder[event.order_id]) {
      byOrder[event.order_id] = [next];
      return;
    }

    byOrder[event.order_id].push(next);
  });

  return byOrder;
}

export async function updateOperationalOrderAction(formData: FormData) {
  "use server";

  const orderId = readFormString(formData, "order_id");
  const siteId = readFormString(formData, "site_id");
  const op = readFormString(formData, "op");
  const view = asViewFilter(readFormString(formData, "view"));
  const fulfillment = asFulfillmentFilter(readFormString(formData, "fulfillment"));

  if (!UUID_REGEX.test(orderId)) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: "Pedido invalido." }));
  }

  if (!UUID_REGEX.test(siteId)) {
    redirect(buildOrdersHref({ view, fulfillment, error: "Sede invalida." }));
  }

  if (!VALID_OPS.includes(op as OpsAction)) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: "Operacion no soportada." }));
  }

  const returnTo = buildOrdersHref({ siteId, view, fulfillment });
  const { supabase } = await requireAppAccess({
    appId: "pulso",
    returnTo,
    siteId,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: true,
  });

  const operation = op as OpsAction;
  if (operation !== "mark_cancelled") {
    const { data: paymentOrder, error: paymentOrderError } = await supabase
      .from("orders")
      .select("id,payment_status")
      .eq("id", orderId)
      .eq("site_id", siteId)
      .maybeSingle();

    if (paymentOrderError || paymentOrder?.payment_status !== "paid") {
      redirect(buildOrdersHref({ siteId, view, fulfillment, error: "No puedes operar un pedido sin pago aprobado." }));
    }
  }

  if (operation === "mark_in_transit") {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,site_id,fulfillment_type,status")
      .eq("id", orderId)
      .eq("site_id", siteId)
      .maybeSingle();

    const orderRow = (order ?? null) as OrderOpsRow | null;
    if (orderError || !orderRow?.id || orderRow.fulfillment_type !== "delivery") {
      redirect(buildOrdersHref({ siteId, view, fulfillment, error: "Solo pedidos delivery pueden pasar a 'En camino'." }));
    }
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "update_order_operational_state",
    {
      p_order_id: orderId,
      p_site_id: siteId,
      p_operation: operation,
      p_metadata: {
        source: "pulso_orders_board",
      },
    }
  );

  if (rpcError) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: rpcError.message }));
  }

  const ok = Boolean((rpcResult as { ok?: boolean } | null)?.ok);
  if (!ok) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: "No pudimos actualizar el pedido." }));
  }

  redirect(buildOrdersHref({ siteId, view, fulfillment, message: "Pedido actualizado." }));
}

export async function assignDispatchOrderAction(formData: FormData) {
  "use server";

  const orderId = readFormString(formData, "order_id");
  const siteId = readFormString(formData, "site_id");
  const view = asViewFilter(readFormString(formData, "view"));
  const fulfillment = asFulfillmentFilter(readFormString(formData, "fulfillment"));
  const dispatchPartner = readFormString(formData, "dispatch_partner");
  const dispatchReference = readFormString(formData, "dispatch_reference");

  if (!UUID_REGEX.test(orderId)) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: "Pedido invalido." }));
  }

  if (!UUID_REGEX.test(siteId)) {
    redirect(buildOrdersHref({ view, fulfillment, error: "Sede invalida." }));
  }

  if (!dispatchPartner && !dispatchReference) {
    redirect(
      buildOrdersHref({
        siteId,
        view,
        fulfillment,
        error: "Ingresa aliado o referencia para asignar domicilio.",
      })
    );
  }

  const returnTo = buildOrdersHref({ siteId, view, fulfillment });
  const { supabase } = await requireAppAccess({
    appId: "pulso",
    returnTo,
    siteId,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: true,
  });

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "update_order_operational_state",
    {
      p_order_id: orderId,
      p_site_id: siteId,
      p_operation: "assign_dispatch",
      p_dispatch_partner: dispatchPartner || null,
      p_dispatch_reference: dispatchReference || null,
      p_metadata: {
        source: "pulso_orders_board",
      },
    }
  );

  if (rpcError) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: rpcError.message }));
  }

  const ok = Boolean((rpcResult as { ok?: boolean } | null)?.ok);
  if (!ok) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: "No pudimos asignar el domiciliario." }));
  }

  redirect(
    buildOrdersHref({
      siteId,
      view,
      fulfillment,
      message: "Domiciliario asignado al pedido.",
    })
  );
}

export async function sendOrderMessageAction(formData: FormData) {
  "use server";

  const conversationId = readFormString(formData, "conversation_id");
  const orderId = readFormString(formData, "order_id");
  const siteId = readFormString(formData, "site_id");
  const view = asViewFilter(readFormString(formData, "view"));
  const fulfillment = asFulfillmentFilter(readFormString(formData, "fulfillment"));
  const body = readFormString(formData, "body");

  if (!UUID_REGEX.test(conversationId) || !UUID_REGEX.test(orderId) || !UUID_REGEX.test(siteId)) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: "Chat invalido." }));
  }

  if (!body) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: "El mensaje no puede estar vacio." }));
  }

  const returnTo = buildOrdersHref({ siteId, view, fulfillment });
  const { supabase, user } = await requireAppAccess({
    appId: "pulso",
    returnTo,
    siteId,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: true,
  });

  const { error: insertError } = await supabase.from("order_messages").insert({
    conversation_id: conversationId,
    order_id: orderId,
    site_id: siteId,
    author_id: user.id,
    author_type: "staff",
    body,
  });

  if (insertError) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: insertError.message }));
  }

  redirect(buildOrdersHref({ siteId, view, fulfillment, message: "Mensaje enviado." }));
}

export default async function OrdersOperationalPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const view = asViewFilter(params?.view);
  const fulfillment = asFulfillmentFilter(params?.fulfillment);
  const returnTo = params?.site_id ? `/orders?site_id=${params.site_id}` : "/orders";

  const { supabase, siteId } = await requireAppAccess({
    appId: "pulso",
    returnTo,
    siteId: params?.site_id ?? null,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: true,
  });

  let query = supabase
    .from("orders")
    .select(
      "id,created_at,status,payment_status,total_amount,fulfillment_type,dispatch_status,site_id,source,guest_info,contact_phone,notes,delivery_address,delivery_zone,dispatch_partner,dispatch_reference"
    )
    .eq("site_id", siteId ?? "")
    .order("created_at", { ascending: false })
    .limit(120);

  if (view === "active") {
    query = query.in("status", [
      "pending",
      "confirmed",
      "preparing",
      "ready_for_dispatch",
      "in_transit",
      "on_the_way",
    ]);
  } else if (view === "delivered") {
    query = query.eq("status", "delivered");
  } else if (view === "cancelled") {
    query = query.eq("status", "cancelled");
  }

  if (fulfillment !== "all") {
    query = query.eq("fulfillment_type", fulfillment);
  }

  const { data, error } = await query;
  const orders = (data ?? []) as OrderRow[];

  const orderIds = orders.map((order) => order.id);
  let orderItemsByOrder: Record<string, OrderItemView[]> = {};
  let orderItemsError: string | null = null;
  let orderEventsByOrder: Record<string, OrderStatusEventView[]> = {};
  let orderEventsError: string | null = null;
  let conversationByOrder: Record<string, OrderConversationRow> = {};
  let messagesByConversation: Record<string, OrderMessageRow[]> = {};
  let orderMessagesError: string | null = null;

  if (orderIds.length > 0) {
    const { data: orderItemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("id,order_id,product_id,quantity,unit_price,total_amount,notes")
      .in("order_id", orderIds);

    if (itemsError) {
      orderItemsError = itemsError.message;
    } else {
      const rawItems = (orderItemsData ?? []) as OrderItemRow[];
      const productIds = Array.from(new Set(rawItems.map((item) => item.product_id).filter(Boolean)));
      const productNameById = new Map<string, string>();

      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from("products")
          .select("id,name")
          .in("id", productIds);

        ((productsData ?? []) as ProductRow[]).forEach((product) => {
          if (!product.id) return;
          productNameById.set(product.id, product.name || "Producto");
        });
      }

      orderItemsByOrder = mapOrderItems(rawItems, productNameById);
    }

    const { data: orderEventsData, error: eventsError } = await supabase
      .from("order_status_events")
      .select(
        "id,order_id,changed_by,actor_type,operation,from_status,to_status,from_dispatch_status,to_dispatch_status,dispatch_partner,dispatch_reference,metadata,created_at"
      )
      .in("order_id", orderIds)
      .order("created_at", { ascending: false })
      .limit(orderIds.length * 8);

    if (eventsError) {
      orderEventsError = eventsError.message;
    } else {
      const rawEvents = (orderEventsData ?? []) as OrderStatusEventRow[];
      const actorIds = Array.from(
        new Set(
          rawEvents
            .map((event) => event.changed_by)
            .filter((value): value is string => Boolean(value))
        )
      );
      const actorNameById = new Map<string, string>();

      if (actorIds.length > 0) {
        const { data: employeesData } = await supabase
          .from("employees")
          .select("id,alias,full_name")
          .in("id", actorIds);

        ((employeesData ?? []) as EmployeeRow[]).forEach((employee) => {
          const name = employee.alias || employee.full_name || `Staff ${employee.id.slice(0, 8)}`;
          actorNameById.set(employee.id, name);
        });
      }

      orderEventsByOrder = mapOrderEvents(rawEvents, actorNameById);
    }

    const { data: conversationsData, error: conversationsError } = await supabase
      .from("order_conversations")
      .select("id,order_id,site_id,client_id,status,last_message_at")
      .in("order_id", orderIds)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (conversationsError) {
      orderMessagesError = conversationsError.message;
    } else {
      const rawConversations = (conversationsData ?? []) as OrderConversationRow[];
      conversationByOrder = Object.fromEntries(
        rawConversations.map((conversation) => [conversation.order_id, conversation])
      );

      const conversationIds = rawConversations.map((conversation) => conversation.id);
      if (conversationIds.length > 0) {
        const { data: messagesData, error: messagesError } = await supabase
          .from("order_messages")
          .select("id,conversation_id,order_id,site_id,author_id,author_type,body,created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: true })
          .limit(conversationIds.length * 20);

        if (messagesError) {
          orderMessagesError = messagesError.message;
        } else {
          const rawMessages = (messagesData ?? []) as OrderMessageRow[];
          messagesByConversation = rawMessages.reduce<Record<string, OrderMessageRow[]>>((acc, message) => {
            if (!acc[message.conversation_id]) acc[message.conversation_id] = [];
            acc[message.conversation_id].push(message);
            return acc;
          }, {});
        }
      }
    }
  }

  const activeCount = orders.filter(
    (row) =>
      row.status === "pending" ||
      row.status === "confirmed" ||
      row.status === "preparing" ||
      row.status === "ready_for_dispatch" ||
      row.status === "in_transit" ||
      row.status === "on_the_way"
  ).length;

  const dispatchReadyCount = orders.filter(
    (row) => row.fulfillment_type === "delivery" && row.status === "ready_for_dispatch"
  ).length;

  const baseHref = buildOrdersHref({ siteId, view, fulfillment });

  return (
    <div className="w-full space-y-6">
      <div className="ui-panel ui-panel--halo">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="ui-h1">Tablero operativo de pedidos</h1>
            <p className="mt-2 ui-body-muted">
              Gestiona estado de preparación y despacho en tiempo real por sede.
            </p>
          </div>
          <Link href={baseHref} className="ui-btn ui-btn--ghost h-10 px-3 text-sm">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="ui-chip ui-chip--brand">Activos: {activeCount}</span>
          <span className="ui-chip ui-chip--warn">Listos despacho: {dispatchReadyCount}</span>
          <span className="ui-chip">Sede: {(siteId || "").slice(0, 8)}</span>
        </div>
      </div>

      {params?.message ? <div className="ui-alert ui-alert--success">{params.message}</div> : null}
      {params?.error ? <div className="ui-alert ui-alert--error">{params.error}</div> : null}
      {error ? <div className="ui-alert ui-alert--error">Error cargando pedidos: {error.message}</div> : null}
      {orderItemsError ? (
        <div className="ui-alert ui-alert--warn">No se pudo cargar el detalle de items: {orderItemsError}</div>
      ) : null}
      {orderEventsError ? (
        <div className="ui-alert ui-alert--warn">No se pudo cargar la bitácora: {orderEventsError}</div>
      ) : null}
      {orderMessagesError ? (
        <div className="ui-alert ui-alert--warn">No se pudo cargar el chat: {orderMessagesError}</div>
      ) : null}

      <div className="ui-panel-soft space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["active", "delivered", "cancelled", "all"] as ViewFilter[]).map((item) => {
            const href = buildOrdersHref({ siteId, view: item, fulfillment });
            const active = view === item;
            const label =
              item === "active"
                ? "Activos"
                : item === "delivered"
                ? "Entregados"
                : item === "cancelled"
                  ? "Cancelados"
                  : "Todos";

            return (
              <Link
                key={item}
                href={href}
                className={`ui-btn h-10 px-3 text-sm ${active ? "ui-btn--brand" : "ui-btn--ghost"}`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["all", "delivery", "pickup", "on_premise"] as FulfillmentFilter[]).map((item) => {
            const href = buildOrdersHref({ siteId, view, fulfillment: item });
            const active = fulfillment === item;
            const label =
              item === "all"
                ? "Todos"
                : item === "delivery"
                  ? "Domicilio"
                  : item === "pickup"
                    ? "Recoger"
                    : "En sitio";

            return (
              <Link
                key={item}
                href={href}
                className={`ui-btn h-10 px-3 text-sm ${active ? "ui-btn--primary" : "ui-btn--ghost"}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="ui-panel">
          <div className="ui-empty-state">
            <PackageCheck />
            <div className="ui-h3">No hay pedidos para estos filtros</div>
            <p className="ui-body-muted">Prueba con otra combinación de estado o fulfillment.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => {
            const detailItems = orderItemsByOrder[order.id] ?? [];
            const detailEvents = orderEventsByOrder[order.id] ?? [];
            const conversation = conversationByOrder[order.id] ?? null;
            const chatMessages = conversation ? messagesByConversation[conversation.id] ?? [] : [];
            const guestName = extractText(order.guest_info, "contact_name");
            const guestPhone = extractText(order.guest_info, "contact_phone") || order.contact_phone;
            const fullAddress = formatAddress(order.delivery_address);
            const statusKey = order.status || "pending";
            const statusClass = STATUS_TONE[statusKey] || "ui-chip";
            const statusLabel = STATUS_LABELS[statusKey] || statusKey;
            const fulfillmentLabel =
              order.fulfillment_type === "delivery"
                ? "Domicilio"
                : order.fulfillment_type === "pickup"
                  ? "Recoger"
                  : "En sitio";

            return (
              <div key={order.id} className="ui-panel space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="ui-label">Pedido</div>
                    <div className="ui-h3">#{order.id.slice(0, 8).toUpperCase()}</div>
                    <div className="mt-1 ui-caption">{formatDate(order.created_at)}</div>
                  </div>
                  <div className={statusClass}>{statusLabel}</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-2">
                    <div className="ui-label">Cliente</div>
                    <div className="ui-body">{guestName || "Sin nombre"}</div>
                    <div className="ui-caption">{guestPhone || "Sin teléfono"}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-2">
                    <div className="ui-label">Fulfillment</div>
                    <div className="ui-body inline-flex items-center gap-2">
                      {order.fulfillment_type === "delivery" ? (
                        <Bike className="h-4 w-4" />
                      ) : (
                        <Store className="h-4 w-4" />
                      )}
                      {fulfillmentLabel}
                    </div>
                    <div className="ui-caption">Despacho: {order.dispatch_status || "not_required"}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-2">
                    <div className="ui-label">Total</div>
                    <div className="ui-body">{formatMoney(order.total_amount)}</div>
                    <div className="ui-caption">Pago: {order.payment_status || "unpaid"}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-2">
                    <div className="ui-label">Origen</div>
                    <div className="ui-body">{order.source || "sin fuente"}</div>
                    <div className="ui-caption">{order.delivery_zone || "Zona no definida"}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-3">
                  <div className="ui-label">Detalle del pedido</div>
                  {detailItems.length === 0 ? (
                    <div className="mt-2 ui-caption">Este pedido no tiene items visibles.</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {detailItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3">
                          <div>
                            <div className="ui-body">
                              {item.quantity} x {item.product_name}
                            </div>
                            <div className="ui-caption">{formatMoney(item.unit_price)} c/u</div>
                            {item.notes ? <div className="ui-caption">Nota: {item.notes}</div> : null}
                          </div>
                          <div className="ui-body font-semibold">{formatMoney(item.total_amount)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {order.fulfillment_type === "delivery" ? (
                  <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-3 space-y-3">
                    <div>
                      <div className="ui-label">Dirección</div>
                      <div className="ui-body">{fullAddress || "Sin dirección cargada"}</div>
                      <div className="ui-caption">
                        Aliado: {order.dispatch_partner || "manual"} · Ref: {order.dispatch_reference || "n/a"}
                      </div>
                    </div>

                    {order.status !== "delivered" && order.status !== "cancelled" ? (
                      <form action={assignDispatchOrderAction} className="space-y-2">
                        <input type="hidden" name="order_id" value={order.id} />
                        <input type="hidden" name="site_id" value={siteId ?? ""} />
                        <input type="hidden" name="view" value={view} />
                        <input type="hidden" name="fulfillment" value={fulfillment} />

                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            className="ui-input"
                            name="dispatch_partner"
                            defaultValue={order.dispatch_partner ?? ""}
                            placeholder="Aliado de domicilio"
                          />
                          <input
                            className="ui-input"
                            name="dispatch_reference"
                            defaultValue={order.dispatch_reference ?? ""}
                            placeholder="Referencia de despacho"
                          />
                        </div>

                        <button type="submit" className="ui-btn ui-btn--brand h-10 px-3 text-sm">
                          Asignar domiciliario
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : null}

                {order.notes ? (
                  <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-2">
                    <div className="ui-label">Notas</div>
                    <div className="ui-body">{order.notes}</div>
                  </div>
                ) : null}

                <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="ui-label">Chat cliente</div>
                      <div className="ui-caption">
                        {conversation
                          ? `Estado: ${conversation.status}`
                          : "El cliente aún no ha abierto chat para este pedido."}
                      </div>
                    </div>
                    {conversation?.last_message_at ? (
                      <div className="ui-caption">Último: {formatDate(conversation.last_message_at)}</div>
                    ) : null}
                  </div>

                  {conversation ? (
                    <div className="mt-3 space-y-3">
                      <div className="max-h-72 space-y-2 overflow-auto pr-1 ui-scrollbar-subtle">
                        {chatMessages.length === 0 ? (
                          <div className="ui-caption">Sin mensajes todavía.</div>
                        ) : (
                          chatMessages.slice(-12).map((message) => {
                            const mine = message.author_type === "staff";
                            return (
                              <div
                                key={message.id}
                                className={`rounded-xl border px-3 py-2 ${
                                  mine
                                    ? "ml-8 border-cyan-200 bg-cyan-50"
                                    : "mr-8 border-[var(--ui-border)] bg-[var(--ui-surface)]"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="ui-caption font-semibold">
                                    {mine ? "Pulso" : message.author_type === "client" ? "Cliente" : "Sistema"}
                                  </div>
                                  <div className="ui-caption">{formatDate(message.created_at)}</div>
                                </div>
                                <div className="mt-1 ui-body text-sm">{message.body}</div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {order.status !== "delivered" && order.status !== "cancelled" ? (
                        <form action={sendOrderMessageAction} className="flex flex-col gap-2 sm:flex-row">
                          <input type="hidden" name="conversation_id" value={conversation.id} />
                          <input type="hidden" name="order_id" value={order.id} />
                          <input type="hidden" name="site_id" value={siteId ?? ""} />
                          <input type="hidden" name="view" value={view} />
                          <input type="hidden" name="fulfillment" value={fulfillment} />
                          <input
                            className="ui-input min-h-10 flex-1"
                            name="body"
                            placeholder="Responder al cliente"
                            maxLength={600}
                          />
                          <button type="submit" className="ui-btn ui-btn--primary h-10 px-3 text-sm">
                            Enviar
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <form action={updateOperationalOrderAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="order_id" value={order.id} />
                  <input type="hidden" name="site_id" value={siteId ?? ""} />
                  <input type="hidden" name="view" value={view} />
                  <input type="hidden" name="fulfillment" value={fulfillment} />

                  {order.payment_status !== "paid" && order.status !== "cancelled" ? (
                    <div className="ui-alert ui-alert--warn w-full">
                      Pago pendiente: este pedido no debe prepararse hasta que Wompi lo confirme.
                    </div>
                  ) : null}

                  {actionButtons(order).map((button) => {
                    const toneClass =
                      button.op === "mark_cancelled" ? "ui-btn--danger" : "ui-btn--primary";
                    const Icon =
                      button.op === "mark_delivered"
                        ? CheckCircle2
                        : button.op === "mark_cancelled"
                          ? XCircle
                          : Clock3;

                    return (
                      <button
                        key={`${order.id}-${button.op}`}
                        type="submit"
                        name="op"
                        value={button.op}
                        className={`ui-btn ${toneClass} h-10 px-3 text-sm`}
                      >
                        <Icon className="h-4 w-4" />
                        {button.label}
                      </button>
                    );
                  })}
                </form>

                <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-3">
                  <div className="ui-label">Bitácora</div>
                  {detailEvents.length === 0 ? (
                    <div className="mt-2 ui-caption">Sin eventos registrados.</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {detailEvents.slice(0, 6).map((event) => (
                        <div key={event.id} className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="ui-body text-sm font-semibold">{event.operation}</div>
                            <div className="ui-caption">{formatDate(event.created_at)}</div>
                          </div>
                          <div className="ui-caption">
                            {event.actor_name}
                            {event.from_status || event.to_status
                              ? ` · ${event.from_status || "-"} → ${event.to_status || "-"}`
                              : ""}
                          </div>
                          {event.to_dispatch_status ? (
                            <div className="ui-caption">
                              Despacho: {event.from_dispatch_status || "-"} → {event.to_dispatch_status}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
