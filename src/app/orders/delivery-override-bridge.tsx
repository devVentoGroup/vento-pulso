"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type TargetOrder = { orderId: string; siteId: string };
type Reason =
  | "client_without_pin"
  | "authorized_third_party"
  | "technical_failure"
  | "other";

type Notice = { tone: "ok" | "error"; text: string } | null;

const REASONS: Array<{ value: Reason; label: string }> = [
  { value: "client_without_pin", label: "Cliente sin acceso al PIN" },
  { value: "authorized_third_party", label: "Entrega a tercero autorizado" },
  { value: "technical_failure", label: "Falla técnica" },
  { value: "other", label: "Otro" },
];

function formValue(form: HTMLFormElement, name: string) {
  const value = new FormData(form).get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function DeliveryOverrideBridge() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const processedRef = useRef<WeakSet<HTMLButtonElement>>(new WeakSet());
  const [target, setTarget] = useState<TargetOrder | null>(null);
  const [reason, setReason] = useState<Reason>("client_without_pin");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const decorateDeliveredButton = useCallback(
    async (button: HTMLButtonElement) => {
      if (processedRef.current.has(button)) return;
      processedRef.current.add(button);

      const form = button.closest("form");
      if (!(form instanceof HTMLFormElement)) return;

      const orderId = formValue(form, "order_id");
      const siteId = formValue(form, "site_id");
      if (!orderId || !siteId) return;

      const { data: order, error } = await supabase
        .from("orders")
        .select("id,fulfillment_type,status")
        .eq("id", orderId)
        .eq("site_id", siteId)
        .maybeSingle();

      if (error || order?.fulfillment_type !== "delivery") return;
      if (!['in_transit', 'on_the_way'].includes(order.status || "")) return;

      button.remove();

      const { data: allowed } = await supabase.rpc("has_permission", {
        p_permission_code: "pulso.delivery.override",
        p_site_id: siteId,
        p_area_id: null,
      });

      const info = document.createElement("div");
      info.className =
        "w-full rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-900";
      info.textContent = allowed
        ? "La entrega se confirma con el PIN del cliente. Usa el override solo cuando exista una excepción real."
        : "La entrega se confirma únicamente desde el portal del domiciliario con el PIN del cliente.";
      form.appendChild(info);

      if (!allowed) return;

      const overrideButton = document.createElement("button");
      overrideButton.type = "button";
      overrideButton.className = "ui-btn h-10 px-4 text-sm border border-amber-300 bg-amber-50 text-amber-900";
      overrideButton.textContent = "Confirmación manual excepcional";
      overrideButton.addEventListener("click", () => {
        setReason("client_without_pin");
        setComment("");
        setTarget({ orderId, siteId });
      });
      form.appendChild(overrideButton);
    },
    [supabase],
  );

  useEffect(() => {
    const scan = () => {
      const buttons = document.querySelectorAll<HTMLButtonElement>(
        'button[name="op"][value="mark_delivered"]',
      );
      buttons.forEach((button) => void decorateDeliveredButton(button));
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [decorateDeliveredButton]);

  const submitOverride = async () => {
    if (!target || busy) return;
    const cleanComment = comment.trim();
    if (cleanComment.length < 8) {
      setNotice({ tone: "error", text: "Escribe un comentario de al menos 8 caracteres." });
      return;
    }

    setBusy(true);
    setNotice(null);
    const { data, error } = await supabase.rpc("override_order_delivery_confirmation", {
      p_order_id: target.orderId,
      p_site_id: target.siteId,
      p_reason: reason,
      p_comment: cleanComment,
      p_metadata: { source: "pulso_orders_delivery_override" },
    });
    const ok = !error && Boolean((data as { ok?: boolean } | null)?.ok);

    if (!ok) {
      const messages: Record<string, string> = {
        permission_denied: "Tu usuario no tiene permiso para confirmar manualmente entregas.",
        delivery_not_in_transit: "El domicilio ya no está en camino.",
        override_comment_required: "El comentario es obligatorio.",
      };
      setNotice({
        tone: "error",
        text: messages[error?.message || ""] || error?.message || "No se pudo confirmar la entrega.",
      });
      setBusy(false);
      return;
    }

    setTarget(null);
    setBusy(false);
    setNotice({ tone: "ok", text: "Entrega confirmada manualmente y registrada en la bitácora." });
    router.refresh();
  };

  return (
    <>
      {notice ? (
        <div className={`fixed bottom-4 left-4 z-[230] max-w-sm rounded-2xl border px-4 py-3 text-sm font-bold shadow-xl ${notice.tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
          <button type="button" onClick={() => setNotice(null)} className="float-right ml-3 text-current/60" aria-label="Cerrar">×</button>
          {notice.text}
        </div>
      ) : null}

      {target ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) setTarget(null); }}>
          <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="delivery-override-title">
            <div className="text-xs font-black uppercase tracking-wide text-amber-700">Acción restringida</div>
            <h2 id="delivery-override-title" className="mt-1 text-xl font-black text-slate-950">Confirmar entrega manualmente</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Esta acción reemplaza la validación por PIN. Debe usarse únicamente ante una excepción comprobada y quedará registrada con tu usuario.</p>

            <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-500">Motivo</label>
            <select value={reason} onChange={(event) => setReason(event.target.value as Reason)} className="ui-input mt-1 w-full" disabled={busy}>
              {REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>

            <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-500">Comentario obligatorio</label>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} className="ui-input mt-1 min-h-28 w-full resize-y" placeholder="Describe quién recibió, por qué no se utilizó el PIN y cómo se verificó la entrega." disabled={busy} />

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="ui-btn h-10 px-4 text-sm" onClick={() => setTarget(null)} disabled={busy}>Cancelar</button>
              <button type="button" className="ui-btn ui-btn--danger h-10 px-4 text-sm" onClick={() => void submitOverride()} disabled={busy}>{busy ? "Confirmando..." : "Confirmar excepcionalmente"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
