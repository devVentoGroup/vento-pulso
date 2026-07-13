"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = { siteId: string };
type Notice = { tone: "ok" | "error"; text: string } | null;

type DeliveryOrder = {
  id: string;
  status: string | null;
  payment_status: string | null;
  dispatch_partner: string | null;
  dispatch_reference: string | null;
  contact_phone: string | null;
  notes: string | null;
  delivery_zone: string | null;
  delivery_address: Record<string, unknown> | null;
  guest_info: Record<string, unknown> | null;
  total_amount: number | string | null;
  is_gift: boolean | null;
};

function text(source: Record<string, unknown> | null, key: string) {
  const value = source?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildMessage(order: DeliveryOrder, portalUrl: string) {
  const address = order.delivery_address;
  const guest = order.guest_info;
  const gift = guest?.gift && typeof guest.gift === "object" ? guest.gift as Record<string, unknown> : null;
  const name = text(gift, "recipient_name") || text(guest, "contact_name") || "Cliente";
  const phone = text(gift, "recipient_phone") || order.contact_phone || text(guest, "contact_phone");
  const line1 = text(address, "line1") || "Sin dirección cargada";
  const details = [text(address, "type"), text(address, "label"), text(address, "details"), text(address, "reference")].filter(Boolean).join(" · ");
  const instructions = text(address, "instructions");
  const lat = address?.latitude;
  const lng = address?.longitude;
  const maps = typeof lat === "number" && typeof lng === "number"
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(line1)}`;
  const amount = order.payment_status === "paid" ? "Pagado" : `Cobrar $${Number(order.total_amount || 0).toLocaleString("es-CO")}`;
  const giftRule = order.is_gift
    ? `\n🎁 Regalo${gift?.is_surprise === true ? " sorpresa" : ""}. ${gift?.hide_prices === true ? "No mostrar precios." : ""}`
    : "";

  return [
    `*DOMICILIO VENTO · #${order.id.slice(0, 8).toUpperCase()}*`,
    `Cliente: ${name}`,
    phone ? `Teléfono: ${phone}` : null,
    `Dirección: ${line1}`,
    details ? `Detalles: ${details}` : null,
    instructions ? `Instrucciones: ${instructions}` : null,
    order.delivery_zone ? `Zona: ${order.delivery_zone}` : null,
    `Pago: ${amount}`,
    order.notes ? `Notas: ${order.notes}` : null,
    giftRule || null,
    `Maps: ${maps}`,
    "",
    "Abre este enlace para registrar recogida, salida, novedad o confirmar la entrega con el PIN del cliente:",
    portalUrl,
  ].filter(Boolean).join("\n");
}

export function DeliveryDispatchBridge({ siteId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!siteId) return;

    const onSubmit = async (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.elements.namedItem("dispatch_partner") && !form.elements.namedItem("dispatch_reference")) return;

      const data = new FormData(form);
      const orderId = String(data.get("order_id") || "");
      const partner = String(data.get("dispatch_partner") || "").trim();
      const reference = String(data.get("dispatch_reference") || "").trim();
      if (!orderId || (!partner && !reference)) return;

      const whatsappWindow = window.open("about:blank", "vento-delivery-whatsapp");
      setNotice({ tone: "ok", text: "Guardando asignación y preparando enlace..." });

      await new Promise((resolve) => window.setTimeout(resolve, 550));

      const { data: row, error: orderError } = await supabase
        .from("orders")
        .select("id,status,payment_status,dispatch_partner,dispatch_reference,contact_phone,notes,delivery_zone,delivery_address,guest_info,total_amount,is_gift")
        .eq("id", orderId)
        .eq("site_id", siteId)
        .maybeSingle();

      const order = row as DeliveryOrder | null;
      const assignmentSaved = order &&
        (!partner || order.dispatch_partner === partner) &&
        (!reference || order.dispatch_reference === reference);

      if (orderError || !assignmentSaved) {
        whatsappWindow?.close();
        setNotice({ tone: "error", text: "La asignación no quedó guardada. No se generó el enlace." });
        return;
      }

      const { data: linkData, error: linkError } = await supabase.rpc("create_order_delivery_courier_link", {
        p_order_id: orderId,
        p_site_id: siteId,
      });
      const portalUrl = (linkData as { url?: string } | null)?.url;

      if (linkError || !portalUrl) {
        whatsappWindow?.close();
        setNotice({ tone: "error", text: linkError?.message || "No se pudo generar el enlace del domiciliario." });
        return;
      }

      try { await navigator.clipboard.writeText(portalUrl); } catch {}
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(buildMessage(order, portalUrl))}`;
      if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
      else window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      setNotice({ tone: "ok", text: "Enlace copiado. WhatsApp quedó listo para enviarlo." });
    };

    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, [siteId, supabase]);

  if (!notice) return null;
  return (
    <div className={`fixed bottom-4 right-4 z-[200] max-w-sm rounded-2xl border px-4 py-3 text-sm font-bold shadow-xl ${notice.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
      <button type="button" onClick={() => setNotice(null)} className="float-right ml-3 text-current/60" aria-label="Cerrar">×</button>
      {notice.text}
    </div>
  );
}
