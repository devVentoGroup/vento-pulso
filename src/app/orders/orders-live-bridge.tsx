"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Radio,
  Volume2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type LiveOrderRow = {
  id: string;
  site_id: string | null;
  created_at?: string | null;
  status?: string | null;
  payment_status?: string | null;
  total_amount?: number | string | null;
  fulfillment_type?: string | null;
};

type OrdersLiveBridgeProps = {
  siteId: string;
};

function formatMoney(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatFulfillment(value: string | null | undefined) {
  if (value === "delivery") return "Domicilio";
  if (value === "pickup") return "Recoger";
  if (value === "on_premise") return "En sitio";
  return "Pedido";
}

function canUseNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function OrdersLiveBridge({ siteId }: OrdersLiveBridgeProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const originalTitleRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [liveStatus, setLiveStatus] = useState<"connecting" | "connected" | "error" | "closed">(
    "connecting",
  );
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    "default" | "granted" | "denied" | "unsupported"
  >("default");
  const [alertActive, setAlertActive] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [lastNotice, setLastNotice] = useState("Esperando pedidos nuevos...");

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, 350);
  }, [router]);

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === "undefined") return null;

    const webkitWindow = window as Window & typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };

    const AudioContextCtor = window.AudioContext || webkitWindow.webkitAudioContext;

    if (!AudioContextCtor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const playAlertSound = useCallback(async () => {
    if (!alertsEnabled) return;

    const audioContext = await ensureAudioContext();
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.38);
  }, [alertsEnabled, ensureAudioContext]);

  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if (!canUseNotifications()) return;
    if (Notification.permission !== "granted") return;

    const notification = new Notification(title, {
      body,
      tag: "vento-pulso-new-order",
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }, []);

  const raiseOperationalAlert = useCallback(
    async ({
      title,
      body,
      notice,
    }: {
      title: string;
      body: string;
      notice: string;
    }) => {
      setAlertActive(true);
      setLastNotice(notice);
      setAlertCount((current) => {
        const next = current + 1;
        document.title = `🔔 ${next} alerta${next === 1 ? "" : "s"} · Vento Pulso`;
        return next;
      });

      await playAlertSound();
      sendBrowserNotification(title, body);
      scheduleRefresh();
    },
    [playAlertSound, scheduleRefresh, sendBrowserNotification],
  );

  const handleEnableAlerts = useCallback(async () => {
    await ensureAudioContext();
    setAlertsEnabled(true);

    if (!canUseNotifications()) {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }, [ensureAudioContext]);

  const acknowledgeAlerts = useCallback(() => {
    setAlertActive(false);
    setAlertCount(0);
    setLastNotice("Alertas atendidas.");
    document.title = originalTitleRef.current || "Vento Pulso";
  }, []);

  useEffect(() => {
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }

    if (!canUseNotifications()) {
      setNotificationPermission("unsupported");
    } else {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!siteId) {
      setLiveStatus("error");
      return;
    }

    setLiveStatus("connecting");

    const channel = supabase
      .channel(`pulso-orders-live-${siteId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `site_id=eq.${siteId}`,
        },
        (payload) => {
          const order = payload.new as LiveOrderRow;
          const fulfillmentLabel = formatFulfillment(order.fulfillment_type);
          const totalLabel = formatMoney(order.total_amount);

          void raiseOperationalAlert({
            title: "Nuevo pedido en Vento Pulso",
            body: `${fulfillmentLabel} · ${totalLabel}`,
            notice: `Nuevo pedido ${fulfillmentLabel.toLowerCase()} recibido.`,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `site_id=eq.${siteId}`,
        },
        (payload) => {
          const previousOrder = payload.old as LiveOrderRow;
          const nextOrder = payload.new as LiveOrderRow;

          const paymentWasApproved =
            previousOrder.payment_status !== "paid" && nextOrder.payment_status === "paid";

          if (paymentWasApproved && nextOrder.fulfillment_type === "delivery") {
            void raiseOperationalAlert({
              title: "Pago aprobado",
              body: `Domicilio listo para preparar · ${formatMoney(nextOrder.total_amount)}`,
              notice: "Un domicilio ya tiene pago aprobado y puede operarse.",
            });
            return;
          }

          scheduleRefresh();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLiveStatus("connected");
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setLiveStatus("error");
          return;
        }

        if (status === "CLOSED") {
          setLiveStatus("closed");
        }
      });

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      void supabase.removeChannel(channel);
      document.title = originalTitleRef.current || "Vento Pulso";
    };
  }, [raiseOperationalAlert, scheduleRefresh, siteId, supabase]);

  useEffect(() => {
    if (!alertActive || !alertsEnabled) return;

    const interval = setInterval(() => {
      void playAlertSound();
    }, 10000);

    return () => clearInterval(interval);
  }, [alertActive, alertsEnabled, playAlertSound]);

  const liveCopy =
    liveStatus === "connected"
      ? "En vivo"
      : liveStatus === "connecting"
        ? "Conectando"
        : "Sin conexión live";

  const LiveIcon = liveStatus === "connected" ? Wifi : WifiOff;

  return (
    <div className="space-y-3">
      {alertActive ? (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white">
                <BellRing className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="text-sm font-black text-slate-950">
                  {alertCount} alerta{alertCount === 1 ? "" : "s"} operativa{alertCount === 1 ? "" : "s"}
                </div>
                <div className="text-sm text-slate-600">{lastNotice}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={acknowledgeAlerts}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-cyan-50"
            >
              <X className="h-4 w-4" />
              Atendido
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div
          className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-black ring-1 ${
            liveStatus === "connected"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-amber-50 text-amber-700 ring-amber-200"
          }`}
        >
          <LiveIcon className="h-3.5 w-3.5" />
          {liveCopy}
        </div>

        <div
          className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-black ring-1 ${
            alertsEnabled
              ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
              : "bg-slate-50 text-slate-600 ring-slate-200"
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          Alertas {alertsEnabled ? "activas" : "sin activar"}
        </div>

        {!alertsEnabled ? (
          <button
            type="button"
            onClick={handleEnableAlerts}
            className="inline-flex h-8 items-center gap-2 rounded-full bg-slate-950 px-3 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
          >
            <Volume2 className="h-3.5 w-3.5" />
            Activar sonido y notificaciones
          </button>
        ) : null}

        {notificationPermission === "denied" ? (
          <span className="text-xs font-semibold text-amber-700">
            Notificaciones bloqueadas por el navegador.
          </span>
        ) : null}
      </div>
    </div>
  );
}
