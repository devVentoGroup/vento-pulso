"use client";

import type { ComponentProps } from "react";
import {
  EyeOff,
  Gift,
  MessageSquareText,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";

import { OrdersBoard as BaseOrdersBoard } from "./orders-board-legacy";

type OrdersBoardProps = ComponentProps<typeof BaseOrdersBoard>;
type OrderEntry = OrdersBoardProps["orders"][number];

type GiftSnapshot = {
  buyerName: string | null;
  buyerPhone: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientRelationship: string | null;
  isSurprise: boolean;
  contactPolicy: "buyer_first" | "recipient_allowed";
  fallbackContactPolicy: "recipient_allowed" | "buyer_only";
  cardRequested: boolean;
  cardMessage: string | null;
  cardTo: string | null;
  cardFrom: string | null;
  cardStatus: string | null;
  hidePrices: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBoolean(record: Record<string, unknown>, key: string, fallback = false) {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}

function readGiftSnapshot(entry: OrderEntry): GiftSnapshot | null {
  const guestInfo = asRecord(entry.order.guest_info);
  const gift = asRecord(guestInfo?.gift);

  if (!gift || readBoolean(gift, "is_gift") !== true) return null;

  const contactPolicy = readText(gift, "contact_policy");
  const fallbackContactPolicy = readText(gift, "fallback_contact_policy");

  return {
    buyerName: readText(gift, "buyer_name"),
    buyerPhone: readText(gift, "buyer_phone"),
    recipientName: readText(gift, "recipient_name"),
    recipientPhone: readText(gift, "recipient_phone"),
    recipientRelationship: readText(gift, "recipient_relationship"),
    isSurprise: readBoolean(gift, "is_surprise"),
    contactPolicy: contactPolicy === "recipient_allowed" ? "recipient_allowed" : "buyer_first",
    fallbackContactPolicy:
      fallbackContactPolicy === "buyer_only" ? "buyer_only" : "recipient_allowed",
    cardRequested: readBoolean(gift, "card_requested"),
    cardMessage: readText(gift, "card_message"),
    cardTo: readText(gift, "card_to"),
    cardFrom: readText(gift, "card_from"),
    cardStatus: readText(gift, "card_status"),
    hidePrices: readBoolean(gift, "hide_prices", true),
  };
}

function contactInstruction(gift: GiftSnapshot) {
  if (gift.contactPolicy === "recipient_allowed") {
    return "Se puede contactar directamente al destinatario.";
  }

  if (gift.fallbackContactPolicy === "recipient_allowed") {
    return "Contactar primero al comprador. Si no responde, contactar al destinatario.";
  }

  return "Contactar únicamente al comprador.";
}

function cardStatusLabel(value: string | null) {
  const labels: Record<string, string> = {
    pending: "Pendiente de preparar",
    prepared: "Preparada",
    included: "Incluida",
    not_requested: "No solicitada",
  };
  return value ? labels[value] || value : "Pendiente";
}

function GiftOperationalSummary({
  gift,
  originalNotes,
}: {
  gift: GiftSnapshot;
  originalNotes: string | null;
}) {
  return (
    <div className="space-y-3 font-normal">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-100 px-2.5 py-1 text-xs font-black text-pink-800">
          <Gift className="h-3.5 w-3.5" /> Regalo
        </span>
        {gift.isSurprise ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
            <Sparkles className="h-3.5 w-3.5" /> Sorpresa
          </span>
        ) : null}
        {gift.hidePrices ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700">
            <EyeOff className="h-3.5 w-3.5" /> Sin precios
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-pink-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-pink-700">
            <Gift className="h-4 w-4" /> Destinatario
          </div>
          <div className="mt-2 text-sm font-black text-slate-950">
            {gift.recipientName || "Sin nombre"}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Phone className="h-3.5 w-3.5" /> {gift.recipientPhone || "Sin teléfono"}
          </div>
          {gift.recipientRelationship ? (
            <div className="mt-1 text-xs text-slate-500">Relación: {gift.recipientRelationship}</div>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
            <UserRound className="h-4 w-4" /> Comprador
          </div>
          <div className="mt-2 text-sm font-black text-slate-950">
            {gift.buyerName || "Sin nombre"}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Phone className="h-3.5 w-3.5" /> {gift.buyerPhone || "Sin teléfono"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950">
        <div className="text-xs font-black uppercase tracking-wide text-cyan-700">Contacto durante la entrega</div>
        <div className="mt-1 font-bold">{contactInstruction(gift)}</div>
      </div>

      {gift.cardRequested ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-violet-950">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-violet-700">
              <MessageSquareText className="h-4 w-4" /> Tarjeta
            </div>
            <span className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-black text-violet-700">
              {cardStatusLabel(gift.cardStatus)}
            </span>
          </div>
          {gift.cardTo ? <div className="mt-2 text-sm font-bold">Para: {gift.cardTo}</div> : null}
          <div className="mt-2 whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-sm font-semibold leading-5 text-slate-800">
            {gift.cardMessage || "Sin mensaje"}
          </div>
          {gift.cardFrom ? <div className="mt-2 text-sm font-bold">De: {gift.cardFrom}</div> : null}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
          No solicitó tarjeta.
        </div>
      )}

      {gift.hidePrices ? (
        <div className="rounded-xl border-2 border-slate-900 bg-slate-900 px-3 py-2 text-sm font-black text-white">
          EMPAQUE SIN PRECIOS
        </div>
      ) : null}

      {originalNotes ? (
        <div className="rounded-xl border border-amber-200 bg-white p-3">
          <div className="text-xs font-black uppercase tracking-wide text-amber-700">Notas del cliente</div>
          <div className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-800">{originalNotes}</div>
        </div>
      ) : null}
    </div>
  );
}

function enhanceGiftOrder(entry: OrderEntry): OrderEntry {
  const gift = readGiftSnapshot(entry);
  if (!gift) return entry;

  const originalNotes = typeof entry.order.notes === "string" ? entry.order.notes : null;
  const recipientLabel = gift.recipientName
    ? `Para: ${gift.recipientName}`
    : entry.guestName || "Destinatario sin nombre";

  return {
    ...entry,
    statusLabel: `🎁 Regalo · ${entry.statusLabel}`,
    guestName: recipientLabel,
    guestPhone: gift.recipientPhone || entry.guestPhone,
    sourceLabel: gift.isSurprise ? `${entry.sourceLabel} · Sorpresa` : entry.sourceLabel,
    order: {
      ...entry.order,
      notes: (
        <GiftOperationalSummary gift={gift} originalNotes={originalNotes} />
      ) as unknown as string,
    },
  };
}

export function OrdersBoard(props: OrdersBoardProps) {
  const giftCount = props.orders.reduce(
    (count, entry) => count + (readGiftSnapshot(entry) ? 1 : 0),
    0,
  );
  const orders = props.orders.map(enhanceGiftOrder);

  return (
    <>
      {giftCount > 0 ? (
        <div className="mb-3 flex items-start gap-3 rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-pink-950 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-600 text-white">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black">
              {giftCount} pedido{giftCount === 1 ? "" : "s"} de regalo en esta vista
            </div>
            <div className="mt-0.5 text-xs font-semibold text-pink-700">
              Revisa sorpresa, contacto, tarjeta y empaque antes de operar el pedido.
            </div>
          </div>
        </div>
      ) : null}

      <BaseOrdersBoard {...props} orders={orders} />
    </>
  );
}
