import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageCheck } from "lucide-react";

import { requireAppAccess } from "@/lib/auth/guard";
import { OrdersBoard } from "./orders-board";
import { OrdersLiveBridge } from "./orders-live-bridge";

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

type OrderBillingRequestRow = {
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

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  total_amount: number | string | null;
  notes: string | null;
};

type OrderItemOptionRow = {
  id: string;
  order_item_id: string;
  option_group_id: string | null;
  option_id: string | null;
  group_name: string;
  option_name: string;
  quantity: number | string | null;
  price_delta_amount: number | string | null;
  total_delta_amount: number | string | null;
  metadata: Record<string, unknown> | null;
};

type ProductRow = {
  id: string;
  name: string | null;
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

type SendOrderMessageLiveResult =
  | { ok: true; message: OrderMessageRow }
  | { ok: false; error: string };

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

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  pending_payment: "Pendiente de pago",
  unpaid: "Sin pagar",
  failed: "Fallido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  not_required: "No requiere pago",
};

const DISPATCH_STATUS_LABELS: Record<string, string> = {
  not_required: "No requiere despacho",
  pending: "Pendiente",
  assigned: "Asignado",
  ready_for_dispatch: "Listo para despacho",
  in_transit: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const SOURCE_LABELS: Record<string, string> = {
  vento_pass: "Vento Pass",
  pulso: "Vento Pulso",
  pos: "Punto de venta",
  web: "Web",
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
  return Number.isFinite(parsed) ? parsed : 0;
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

function formatPaymentStatusLabel(value: string | null | undefined) {
  if (!value) return "Sin pagar";
  return PAYMENT_STATUS_LABELS[value] || value;
}

function formatDispatchStatusLabel(value: string | null | undefined) {
  if (!value) return "No requiere despacho";
  return DISPATCH_STATUS_LABELS[value] || value;
}

function formatSourceLabel(value: string | null | undefined) {
  if (!value) return "Sin fuente";
  return SOURCE_LABELS[value] || value;
}

function requiresConfirmedOnlinePayment(
  order: Pick<OrderRow, "fulfillment_type" | "payment_status" | "status">
) {
  if (order.status === "cancelled") return false;
  return order.fulfillment_type === "delivery" && order.payment_status !== "paid";
}

function formatOperationalPaymentLabel(
  order: Pick<OrderRow, "fulfillment_type" | "payment_status">
) {
  if (order.fulfillment_type === "pickup") {
    return order.payment_status === "paid" ? "Pagado" : "Pago al recoger";
  }

  if (order.fulfillment_type === "on_premise") {
    return order.payment_status === "paid" ? "Pagado" : "Pago en sede";
  }

  return formatPaymentStatusLabel(order.payment_status);
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

function extractNumber(
  obj: Record<string, unknown> | null | undefined,
  key: string
): number | null {
  if (!obj) return null;
  const value = obj[key];
  const numberValue =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatAddress(deliveryAddress: Record<string, unknown> | null) {
  if (!deliveryAddress) return null;
  const line1 = extractText(deliveryAddress, "line1");
  const reference = extractText(deliveryAddress, "reference");
  if (!line1 && !reference) return null;
  if (line1 && reference) return `${line1} - ${reference}`;
  return line1 || reference;
}

function buildMapsHref(deliveryAddress: Record<string, unknown> | null) {
  const latitude = extractNumber(deliveryAddress, "latitude");
  const longitude = extractNumber(deliveryAddress, "longitude");
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function canMoveToInTransit(order: OrderRow) {
  return order.fulfillment_type === "delivery" && order.status === "ready_for_dispatch";
}

function actionButtons(order: OrderRow) {
  const status = order.status || "pending";
  const buttons: { op: OpsAction; label: string }[] = [];

  if (requiresConfirmedOnlinePayment(order)) {
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
  productsById: Map<string, string>,
  optionsByItemId: Map<string, OrderItemOptionView[]>
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
      options: optionsByItemId.get(item.id) ?? [],
    };

    if (!byOrder[item.order_id]) byOrder[item.order_id] = [];
    byOrder[item.order_id].push(next);
  });

  return byOrder;
}

function mapOrderItemOptions(rawOptions: OrderItemOptionRow[]) {
  const byItemId = new Map<string, OrderItemOptionView[]>();

  rawOptions.forEach((option) => {
    const metadataEffect = option.metadata?.effect_type;
    const next: OrderItemOptionView = {
      id: option.id,
      order_item_id: option.order_item_id,
      group_name: option.group_name,
      option_name: option.option_name,
      quantity: parseMoney(option.quantity),
      price_delta_amount: parseMoney(option.price_delta_amount),
      total_delta_amount: parseMoney(option.total_delta_amount),
      effect_type: typeof metadataEffect === "string" ? metadataEffect : null,
    };

    const current = byItemId.get(option.order_item_id) ?? [];
    current.push(next);
    byItemId.set(option.order_item_id, current);
  });

  return byItemId;
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

    if (!byOrder[event.order_id]) byOrder[event.order_id] = [];
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
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: "Pedido inválido." }));
  }

  if (!UUID_REGEX.test(siteId)) {
    redirect(buildOrdersHref({ view, fulfillment, error: "Sede inválida." }));
  }

  if (!VALID_OPS.includes(op as OpsAction)) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: "Operación no soportada." }));
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
      .select("id,payment_status,fulfillment_type,status")
      .eq("id", orderId)
      .eq("site_id", siteId)
      .maybeSingle();

    const paymentOrderRow = (paymentOrder ?? null) as OrderRow | null;

    if (paymentOrderError || !paymentOrderRow?.id) {
      redirect(
        buildOrdersHref({
          siteId,
          view,
          fulfillment,
          error: "No pudimos validar el pago del pedido.",
        })
      );
    }

    if (requiresConfirmedOnlinePayment(paymentOrderRow)) {
      redirect(
        buildOrdersHref({
          siteId,
          view,
          fulfillment,
          error: "Este domicilio necesita pago aprobado antes de operarse.",
        })
      );
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
      redirect(
        buildOrdersHref({
          siteId,
          view,
          fulfillment,
          error: "Solo pedidos a domicilio pueden pasar a 'En camino'.",
        })
      );
    }
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "update_order_operational_state",
    {
      p_order_id: orderId,
      p_site_id: siteId,
      p_operation: operation,
      p_metadata: { source: "pulso_orders_board" },
    }
  );

  if (rpcError) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: rpcError.message }));
  }

  if (!Boolean((rpcResult as { ok?: boolean } | null)?.ok)) {
    redirect(
      buildOrdersHref({
        siteId,
        view,
        fulfillment,
        error: "No pudimos actualizar el pedido.",
      })
    );
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
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: "Pedido inválido." }));
  }

  if (!UUID_REGEX.test(siteId)) {
    redirect(buildOrdersHref({ view, fulfillment, error: "Sede inválida." }));
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
      p_metadata: { source: "pulso_orders_board" },
    }
  );

  if (rpcError) {
    redirect(buildOrdersHref({ siteId, view, fulfillment, error: rpcError.message }));
  }

  if (!Boolean((rpcResult as { ok?: boolean } | null)?.ok)) {
    redirect(
      buildOrdersHref({
        siteId,
        view,
        fulfillment,
        error: "No pudimos asignar el domiciliario.",
      })
    );
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

export async function sendOrderMessageLiveAction(input: {
  conversationId: string;
  orderId: string;
  siteId: string;
  body: string;
}): Promise<SendOrderMessageLiveResult> {
  "use server";

  const conversationId = input.conversationId?.trim();
  const orderId = input.orderId?.trim();
  const siteId = input.siteId?.trim();
  const body = input.body?.trim();

  if (!UUID_REGEX.test(conversationId) || !UUID_REGEX.test(orderId) || !UUID_REGEX.test(siteId)) {
    return { ok: false, error: "Chat inválido." };
  }

  if (!body) {
    return { ok: false, error: "El mensaje no puede estar vacío." };
  }

  const returnTo = buildOrdersHref({ siteId });
  const { supabase, user } = await requireAppAccess({
    appId: "pulso",
    returnTo,
    siteId,
    permissionCode: ["pos.main"],
    requireAppAccessPermission: true,
  });

  const { data, error } = await supabase
    .from("order_messages")
    .insert({
      conversation_id: conversationId,
      order_id: orderId,
      site_id: siteId,
      author_id: user.id,
      author_type: "staff",
      body,
    })
    .select("id,conversation_id,order_id,site_id,author_id,author_type,body,created_at")
    .single();

  if (error) return { ok: false, error: error.message };

  return { ok: true, message: data as OrderMessageRow };
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

  let billingByOrder: Record<string, OrderBillingRequestRow> = {};
  let billingError: string | null = null;
  let orderItemsByOrder: Record<string, OrderItemView[]> = {};
  let orderItemsError: string | null = null;
  let orderEventsByOrder: Record<string, OrderStatusEventView[]> = {};
  let orderEventsError: string | null = null;
  let conversationByOrder: Record<string, OrderConversationRow> = {};
  let messagesByConversation: Record<string, OrderMessageRow[]> = {};
  let orderMessagesError: string | null = null;

  if (orderIds.length > 0) {
    const { data: billingData, error: billingFetchError } = await supabase
      .from("order_billing_requests")
      .select(
        "id,order_id,client_id,site_id,legal_name,document_type,document_number,verification_digit,billing_email,status,provider,provider_reference,invoice_number,cufe,pdf_url,xml_url,error_message,requested_at,submitted_at,issued_at"
      )
      .in("order_id", orderIds);

    if (billingFetchError) {
      billingError = billingFetchError.message;
    } else {
      billingByOrder = Object.fromEntries(
        ((billingData ?? []) as OrderBillingRequestRow[]).map((billing) => [billing.order_id, billing])
      );
    }

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
      let optionsByItemId = new Map<string, OrderItemOptionView[]>();

      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from("products")
          .select("id,name")
          .in("id", productIds);

        ((productsData ?? []) as ProductRow[]).forEach((product) => {
          if (product.id) productNameById.set(product.id, product.name || "Producto");
        });
      }

      const itemIds = rawItems.map((item) => item.id).filter(Boolean);
      if (itemIds.length > 0) {
        const { data: optionRows, error: optionsError } = await supabase
          .from("order_item_options")
          .select(
            "id,order_item_id,option_group_id,option_id,group_name,option_name,quantity,price_delta_amount,total_delta_amount,metadata"
          )
          .in("order_item_id", itemIds);

        if (optionsError) {
          orderItemsError = optionsError.message;
        } else {
          optionsByItemId = mapOrderItemOptions((optionRows ?? []) as OrderItemOptionRow[]);
        }
      }

      orderItemsByOrder = mapOrderItems(rawItems, productNameById, optionsByItemId);
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
          messagesByConversation = rawMessages.reduce<Record<string, OrderMessageRow[]>>(
            (acc, message) => {
              if (!acc[message.conversation_id]) acc[message.conversation_id] = [];
              acc[message.conversation_id].push(message);
              return acc;
            },
            {}
          );
        }
      }
    }
  }

  const activeCount = orders.filter((row) =>
    ["pending", "confirmed", "preparing", "ready_for_dispatch", "in_transit", "on_the_way"].includes(
      row.status || ""
    )
  ).length;

  const dispatchReadyCount = orders.filter(
    (row) => row.fulfillment_type === "delivery" && row.status === "ready_for_dispatch"
  ).length;

  const boardOrders = orders.map((order) => {
    const items = orderItemsByOrder[order.id] ?? [];
    const conversation = conversationByOrder[order.id] ?? null;
    const statusKey = order.status || "pending";
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      order,
      billing: billingByOrder[order.id] ?? null,
      items,
      events: orderEventsByOrder[order.id] ?? [],
      conversation,
      messages: conversation ? messagesByConversation[conversation.id] ?? [] : [],
      guestName: extractText(order.guest_info, "contact_name"),
      guestPhone: extractText(order.guest_info, "contact_phone") || order.contact_phone,
      fullAddress: formatAddress(order.delivery_address),
      mapsHref: buildMapsHref(order.delivery_address),
      orderCode: order.id.slice(0, 8).toUpperCase(),
      statusLabel: STATUS_LABELS[statusKey] || statusKey,
      statusTone: STATUS_TONE[statusKey] || "ui-chip",
      paymentLabel: formatOperationalPaymentLabel(order),
      dispatchLabel: formatDispatchStatusLabel(order.dispatch_status),
      sourceLabel: formatSourceLabel(order.source),
      fulfillmentLabel:
        order.fulfillment_type === "delivery"
          ? "Domicilio"
          : order.fulfillment_type === "pickup"
            ? "Recoger"
            : "En sitio",
      itemCount,
      paymentBlocked: requiresConfirmedOnlinePayment(order),
      operationButtons: actionButtons(order),
    };
  });

  return (
    <div className="w-full space-y-5">
      <div className="rounded-3xl border border-cyan-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
              Operación en vivo
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Pedidos</h1>
            <p className="mt-1 text-sm text-slate-500">
              Vista compacta. Abre una tarjeta para operar el pedido.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="min-w-20 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
              <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Activos</div>
              <div className="text-lg font-black text-slate-950">{activeCount}</div>
            </div>
            <div className="min-w-20 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
              <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Listos</div>
              <div className="text-lg font-black text-slate-950">{dispatchReadyCount}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <OrdersLiveBridge siteId={siteId ?? ""} />
        </div>
      </div>

      {params?.message ? <div className="ui-alert ui-alert--success">{params.message}</div> : null}
      {params?.error ? <div className="ui-alert ui-alert--error">{params.error}</div> : null}
      {error ? <div className="ui-alert ui-alert--error">Error cargando pedidos: {error.message}</div> : null}
      {orderItemsError ? (
        <div className="ui-alert ui-alert--warn">No se pudo cargar el detalle de productos: {orderItemsError}</div>
      ) : null}
      {orderEventsError ? (
        <div className="ui-alert ui-alert--warn">No se pudo cargar la bitácora: {orderEventsError}</div>
      ) : null}
      {orderMessagesError ? (
        <div className="ui-alert ui-alert--warn">No se pudo cargar el chat: {orderMessagesError}</div>
      ) : null}
      {billingError ? (
        <div className="ui-alert ui-alert--warn">No se pudieron cargar los datos de facturación: {billingError}</div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-black uppercase tracking-wide text-slate-400">Estado</span>
            {(["active", "delivered", "cancelled", "all"] as ViewFilter[]).map((item) => {
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
                  href={buildOrdersHref({ siteId, view: item, fulfillment })}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                    view === item
                      ? "bg-cyan-500 text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className="mr-1 text-xs font-black uppercase tracking-wide text-slate-400">Tipo</span>
            {(["all", "delivery", "pickup", "on_premise"] as FulfillmentFilter[]).map((item) => {
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
                  href={buildOrdersHref({ siteId, view, fulfillment: item })}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                    fulfillment === item
                      ? "bg-cyan-500 text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
              <PackageCheck className="h-6 w-6" />
            </div>
            <div className="text-lg font-black text-slate-950">Sin pedidos en esta vista</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Cuando entre un pedido nuevo aparecerá aquí automáticamente.
            </p>
          </div>
        </div>
      ) : (
        <OrdersBoard
          orders={boardOrders}
          siteId={siteId ?? ""}
          view={view}
          fulfillment={fulfillment}
          updateOperationalOrderAction={updateOperationalOrderAction}
          assignDispatchOrderAction={assignDispatchOrderAction}
          sendOrderMessageLiveAction={sendOrderMessageLiveAction}
        />
      )}
    </div>
  );
}
