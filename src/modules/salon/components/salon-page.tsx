"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  CircleDollarSign,
  Clock3,
  ConciergeBell,
  Map,
  RefreshCw,
  Users,
  UtensilsCrossed,
  Volume2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { buildTableViews, sortCalls } from "@/modules/salon/lib/status";
import type {
  SalonCallRow,
  SalonSessionRow,
  SalonSnapshot,
  SalonTableRow,
  SalonTableStatus,
  SalonTableView,
  SalonZoneRow,
} from "@/modules/salon/types";

type SalonPageProps = {
  siteId: string;
  initialSnapshot: SalonSnapshot;
};

const CANVAS_WIDTH = 1100;
const CANVAS_HEIGHT = 760;

function formatDuration(fromIso: string) {
  const diffMs = Date.now() - new Date(fromIso).getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return `${minutes} min`;
}

function statusTone(status: SalonTableStatus) {
  switch (status) {
    case "attention_requested":
      return "border-rose-300 bg-rose-50 text-rose-700 shadow-[0_14px_30px_rgba(244,63,94,0.20)]";
    case "bill_requested":
      return "border-amber-300 bg-amber-50 text-amber-700 shadow-[0_14px_30px_rgba(245,158,11,0.18)]";
    case "ordering":
      return "border-sky-300 bg-sky-50 text-sky-700 shadow-[0_14px_30px_rgba(14,165,233,0.16)]";
    case "occupied":
      return "border-cyan-300 bg-cyan-50 text-slate-800 shadow-[0_14px_30px_rgba(6,182,212,0.14)]";
    case "blocked":
      return "border-slate-300 bg-slate-100 text-slate-500";
    default:
      return "border-[var(--ui-border)] bg-white text-slate-700 shadow-[var(--ui-shadow-soft)]";
  }
}

function statusLabel(status: SalonTableStatus) {
  switch (status) {
    case "attention_requested":
      return "Llamando";
    case "bill_requested":
      return "Pide cuenta";
    case "ordering":
      return "Pide orden";
    case "occupied":
      return "Ocupada";
    case "blocked":
      return "Bloqueada";
    default:
      return "Libre";
  }
}

function requestTypeLabel(requestType: string) {
  switch (requestType) {
    case "bill":
      return "Cuenta";
    case "order":
      return "Orden";
    case "urgent":
      return "Urgente";
    case "cancel":
      return "Cancelar";
    default:
      return "Atencion";
  }
}

function shapeClass(shape: string) {
  if (shape === "round" || shape === "circle") return "rounded-full";
  if (shape === "rectangle") return "rounded-2xl";
  return "rounded-[22px]";
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

async function fetchSalonSnapshot(siteId: string): Promise<SalonSnapshot> {
  const supabase = createClient();

  const [zonesRes, tablesRes, sessionsRes, callsRes] = await Promise.all([
    supabase
      .from("pos_zones")
      .select("id,site_id,name,color,display_order,is_active")
      .eq("site_id", siteId)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("pos_tables")
      .select(
        "id,site_id,zone_id,name,table_number,shape,capacity,position_x,position_y,rotation,width,height,is_active"
      )
      .eq("site_id", siteId)
      .order("table_number", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase
      .from("pos_sessions")
      .select("id,site_id,table_id,server_id,status,pax,opened_at,closed_at,notes")
      .eq("site_id", siteId)
      .eq("status", "open")
      .order("opened_at", { ascending: false }),
    supabase
      .from("pos_table_service_calls")
      .select(
        "id,site_id,zone_id,table_id,session_id,device_id,source_type,request_type,status,priority,notes,created_by,assigned_to,created_at,acknowledged_at,resolved_at,cancelled_at"
      )
      .eq("site_id", siteId)
      .in("status", ["pending", "acknowledged"])
      .order("created_at", { ascending: false }),
  ]);

  if (zonesRes.error) throw zonesRes.error;
  if (tablesRes.error) throw tablesRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (callsRes.error) throw callsRes.error;

  return {
    zones: (zonesRes.data ?? []) as SalonZoneRow[],
    tables: (tablesRes.data ?? []) as SalonTableRow[],
    sessions: (sessionsRes.data ?? []) as SalonSessionRow[],
    calls: (callsRes.data ?? []) as SalonCallRow[],
  };
}

function ping() {
  if (typeof window === "undefined") return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.value = 0.05;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

export function SalonPage({ siteId, initialSnapshot }: SalonPageProps) {
  const [snapshot, setSnapshot] = useState<SalonSnapshot>(initialSnapshot);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(
    initialSnapshot.zones[0]?.id ?? null
  );
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    initialSnapshot.tables[0]?.id ?? null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionBusy, setIsActionBusy] = useState<string | null>(null);
  const [isCreateBusy, setIsCreateBusy] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [manualRequestType, setManualRequestType] = useState<
    "attention" | "bill" | "order" | "urgent"
  >("attention");
  const callsCountRef = useRef(initialSnapshot.calls.length);

  const tableViews = useMemo(
    () =>
      buildTableViews({
        zones: snapshot.zones,
        tables: snapshot.tables,
        sessions: snapshot.sessions,
        calls: snapshot.calls,
      }),
    [snapshot]
  );
  const sortedCalls = useMemo(() => sortCalls(snapshot.calls), [snapshot.calls]);

  const effectiveZoneId = activeZoneId ?? snapshot.zones[0]?.id ?? null;
  const visibleTables = useMemo(
    () => tableViews.filter((table) => table.zone_id === effectiveZoneId),
    [tableViews, effectiveZoneId]
  );

  const selectedTable =
    tableViews.find((table) => table.id === selectedTableId) ??
    visibleTables[0] ??
    tableViews[0] ??
    null;

  async function refreshSnapshot() {
    setIsRefreshing(true);
    setErrorText(null);
    try {
      const next = await fetchSalonSnapshot(siteId);
      setSnapshot(next);
      callsCountRef.current = next.calls.length;
    } catch (error) {
      console.error("[SALON] refresh error", error);
      setErrorText("No se pudo actualizar el salon.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function updateCallStatus(call: SalonCallRow, nextStatus: "acknowledged" | "resolved") {
    const supabase = createClient();
    setIsActionBusy(call.id);
    setErrorText(null);
    const nowIso = new Date().toISOString();
    const patch =
      nextStatus === "acknowledged"
        ? { status: nextStatus, acknowledged_at: nowIso }
        : { status: nextStatus, resolved_at: nowIso };

    const { error } = await supabase
      .from("pos_table_service_calls")
      .update(patch)
      .eq("id", call.id);

    if (error) {
      console.error("[SALON] update call error", error);
      setErrorText("No se pudo actualizar el llamado.");
      setIsActionBusy(null);
      return;
    }

    await refreshSnapshot();
    setIsActionBusy(null);
  }

  async function createManualCall(table: SalonTableView) {
    const supabase = createClient();
    setIsCreateBusy(true);
    setErrorText(null);

    const priority =
      manualRequestType === "urgent"
        ? "critical"
        : manualRequestType === "bill"
          ? "high"
          : "normal";

    const { error } = await supabase
      .from("pos_table_service_calls")
      .insert({
        site_id: siteId,
        zone_id: table.zone_id,
        table_id: table.id,
        session_id: table.activeSession?.id ?? null,
        source_type: "manual",
        request_type: manualRequestType,
        status: "pending",
        priority,
      });

    if (error) {
      console.error("[SALON] create manual call error", error);
      setErrorText("No se pudo crear el llamado manual.");
      setIsCreateBusy(false);
      return;
    }

    await refreshSnapshot();
    setIsCreateBusy(false);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`salon-live-${siteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pos_table_service_calls" },
        async () => {
          const next = await fetchSalonSnapshot(siteId);
          if (audioEnabled && next.calls.length > callsCountRef.current) {
            ping();
          }
          callsCountRef.current = next.calls.length;
          setSnapshot(next);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pos_sessions" },
        async () => {
          const next = await fetchSalonSnapshot(siteId);
          callsCountRef.current = next.calls.length;
          setSnapshot(next);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [siteId, audioEnabled]);

  useEffect(() => {
    if (!effectiveZoneId && snapshot.zones[0]?.id) {
      setActiveZoneId(snapshot.zones[0].id);
    }
  }, [effectiveZoneId, snapshot.zones]);

  useEffect(() => {
    if (!selectedTableId && visibleTables[0]?.id) {
      setSelectedTableId(visibleTables[0].id);
    }
  }, [selectedTableId, visibleTables]);

  return (
    <div className="space-y-6">
      <section className="ui-panel ui-panel--halo">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="ui-section-title">
              <Map />
              Salon en vivo
            </div>
            <h1 className="ui-h1">Plano operativo de mesas</h1>
            <p className="ui-body-muted max-w-3xl">
              Gestion de salon en tiempo real por zonas, con llamados activos y acciones de atencion para caja.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="ui-chip ui-chip--brand">
              <BellRing className="h-4 w-4" />
              {sortedCalls.length} alertas
            </span>
            <span className="ui-chip">
              <Clock3 className="h-4 w-4" />
              {sortedCalls.filter((call) => call.status === "pending").length} por tomar
            </span>
            <button
              type="button"
              onClick={() => setAudioEnabled((v) => !v)}
              className="ui-btn ui-btn--ghost h-12 px-4"
            >
              <Volume2 className="h-4 w-4" />
              {audioEnabled ? "Sonido ON" : "Sonido OFF"}
            </button>
            <button
              type="button"
              onClick={() => void refreshSnapshot()}
              className="ui-btn ui-btn--primary h-12 px-4"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>
        {errorText ? <div className="ui-alert ui-alert--error mt-4">{errorText}</div> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {snapshot.zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => setActiveZoneId(zone.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  zone.id === effectiveZoneId
                    ? "border-transparent bg-[var(--ui-primary)] text-white shadow-[var(--ui-shadow-1)]"
                    : "border-[var(--ui-border)] bg-white text-[var(--ui-text)] hover:bg-[var(--ui-surface-2)]"
                }`}
              >
                {zone.name}
              </button>
            ))}
          </div>

          <div className="ui-panel-soft overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="ui-h2">
                  {snapshot.zones.find((zone) => zone.id === effectiveZoneId)?.name ?? "Zona"}
                </div>
                <p className="ui-caption">Selecciona una mesa para ver su detalle.</p>
              </div>
              <span className="ui-chip">{visibleTables.length} mesas</span>
            </div>
            <div className="relative overflow-auto rounded-[20px] border border-[var(--ui-border)] bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.12),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f4f9fc_100%)] p-4 ui-scrollbar-subtle">
              <div
                className="relative mx-auto rounded-[24px] border border-dashed border-[var(--ui-border)] bg-white/70"
                style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, minWidth: CANVAS_WIDTH }}
              >
                {visibleTables.map((table) => {
                  const width = clamp(table.width ?? 90, 56, 220);
                  const height = clamp(table.height ?? 90, 56, 220);
                  const left = clamp(table.position_x, 0, CANVAS_WIDTH - width);
                  const top = clamp(table.position_y, 0, CANVAS_HEIGHT - height);
                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => setSelectedTableId(table.id)}
                      className={`absolute flex flex-col items-center justify-center border text-center transition hover:scale-[1.02] ${shapeClass(table.shape)} ${statusTone(table.uiStatus)} ${
                        table.id === selectedTable?.id ? "ring-4 ring-cyan-200" : ""
                      }`}
                      style={{
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                        transform: `rotate(${table.rotation ?? 0}deg)`,
                      }}
                    >
                      <span className="text-sm font-semibold leading-none">
                        {table.table_number ? `Mesa ${table.table_number}` : table.name}
                      </span>
                      <span className="mt-1 text-[11px] font-medium opacity-80">
                        {statusLabel(table.uiStatus)}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        <Users className="h-3 w-3" />
                        {table.activeSession?.pax ?? table.capacity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="ui-panel-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="ui-h3">Alertas activas</div>
              <span className="ui-chip ui-chip--brand">{sortedCalls.length}</span>
            </div>
            <div className="space-y-3">
              {sortedCalls.length === 0 ? (
                <div className="ui-empty-state py-10">
                  <Bell className="h-7 w-7" />
                  <div>No hay llamados activos.</div>
                </div>
              ) : (
                sortedCalls.map((call) => {
                  const table = tableViews.find((item) => item.id === call.table_id) ?? null;
                  const busy = isActionBusy === call.id;
                  return (
                    <div
                      key={call.id}
                      className="rounded-[18px] border border-[var(--ui-border)] bg-white p-4 shadow-[var(--ui-shadow-soft)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`ui-chip ${call.priority !== "normal" ? "ui-chip--warn" : ""}`}>
                              {requestTypeLabel(call.request_type)}
                            </span>
                            <span className="ui-caption">{table?.zoneName ?? "Sin zona"}</span>
                          </div>
                          <div className="text-sm font-semibold text-[var(--ui-text)]">
                            {table?.table_number ? `Mesa ${table.table_number}` : table?.name ?? "Mesa"}
                          </div>
                          <div className="ui-caption">Hace {formatDuration(call.created_at)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedTableId(call.table_id)}
                          className="rounded-lg border border-[var(--ui-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-surface-2)]"
                        >
                          Ver
                        </button>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {call.status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => void updateCallStatus(call, "acknowledged")}
                            disabled={busy}
                            className="ui-btn ui-btn--ghost h-10 flex-1 px-3 text-sm"
                          >
                            <ConciergeBell className="h-4 w-4" />
                            Tomar
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void updateCallStatus(call, "resolved")}
                          disabled={busy}
                          className="ui-btn ui-btn--primary h-10 flex-1 px-3 text-sm"
                        >
                          <BellRing className="h-4 w-4" />
                          Resolver
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="ui-panel-soft">
            <div className="ui-h3 mb-4">Detalle de mesa</div>
            {!selectedTable ? (
              <div className="ui-empty-state py-8">
                <Map className="h-7 w-7" />
                <div>Selecciona una mesa para ver su detalle.</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-[18px] border p-4 ${statusTone(selectedTable.uiStatus)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">
                        {selectedTable.table_number
                          ? `Mesa ${selectedTable.table_number}`
                          : selectedTable.name}
                      </div>
                      <div className="text-sm opacity-80">{selectedTable.zoneName ?? "Sin zona"}</div>
                    </div>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                      {statusLabel(selectedTable.uiStatus)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[var(--ui-border)] bg-white p-4">
                    <div className="ui-caption">Capacidad</div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
                      <Users className="h-4 w-4 text-[var(--ui-brand-600)]" />
                      {selectedTable.capacity}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--ui-border)] bg-white p-4">
                    <div className="ui-caption">Sesion</div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
                      <UtensilsCrossed className="h-4 w-4 text-[var(--ui-brand-600)]" />
                      {selectedTable.activeSession ? "Abierta" : "Sin sesion"}
                    </div>
                  </div>
                </div>

                {selectedTable.activeSession ? (
                  <div className="rounded-2xl border border-[var(--ui-border)] bg-white p-4">
                    <div className="ui-caption">Servicio en curso</div>
                    <div className="mt-2 space-y-2 text-sm text-[var(--ui-text)]">
                      <div className="flex items-center justify-between gap-3">
                        <span>Covers</span>
                        <span className="font-semibold">{selectedTable.activeSession.pax ?? "--"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Abierta hace</span>
                        <span className="font-semibold">
                          {formatDuration(selectedTable.activeSession.opened_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {selectedTable.activeCall ? (
                  <div className="rounded-2xl border border-[var(--ui-border)] bg-white p-4">
                    <div className="ui-caption">Llamado activo</div>
                    <div className="mt-2 flex items-center gap-2 text-base font-semibold text-[var(--ui-text)]">
                      <CircleDollarSign className="h-4 w-4 text-[var(--ui-brand-600)]" />
                      {requestTypeLabel(selectedTable.activeCall.request_type)}
                    </div>
                    <div className="mt-1 text-sm text-[var(--ui-muted)]">
                      Estado:{" "}
                      {selectedTable.activeCall.status === "acknowledged"
                        ? "Tomado"
                        : "Pendiente"}{" "}
                      · hace {formatDuration(selectedTable.activeCall.created_at)}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--ui-border)] bg-white/70 p-4 text-sm text-[var(--ui-muted)]">
                    Sin llamados activos en esta mesa.
                  </div>
                )}

                <div className="rounded-2xl border border-[var(--ui-border)] bg-white p-4">
                  <div className="ui-caption">Crear llamado manual (sin hardware)</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["attention", "bill", "order", "urgent"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setManualRequestType(type)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          manualRequestType === type
                            ? "border-transparent bg-[var(--ui-primary)] text-white"
                            : "border-[var(--ui-border)] bg-white text-[var(--ui-text)] hover:bg-[var(--ui-surface-2)]"
                        }`}
                      >
                        {requestTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void createManualCall(selectedTable)}
                    disabled={isCreateBusy}
                    className="ui-btn ui-btn--brand mt-3 h-10 w-full px-3 text-sm"
                  >
                    <BellRing className="h-4 w-4" />
                    {isCreateBusy ? "Creando..." : "Crear llamado"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
