import type {
  SalonCallRow,
  SalonSessionRow,
  SalonTableRow,
  SalonTableStatus,
  SalonTableView,
  SalonZoneRow,
} from "@/modules/salon/types";

export function deriveTableUiStatus(
  table: SalonTableRow,
  activeSession: SalonSessionRow | null,
  activeCall: SalonCallRow | null
): SalonTableStatus {
  if (!table.is_active) return "blocked";
  if (activeCall) {
    if (activeCall.request_type === "bill") return "bill_requested";
    if (activeCall.request_type === "order") return "ordering";
    return "attention_requested";
  }
  if (activeSession && activeSession.status === "open") return "occupied";
  return "available";
}

export function buildTableViews(input: {
  tables: SalonTableRow[];
  zones: SalonZoneRow[];
  sessions: SalonSessionRow[];
  calls: SalonCallRow[];
}): SalonTableView[] {
  const zoneById = new Map(input.zones.map((zone) => [zone.id, zone]));
  const sessionByTableId = new Map<string, SalonSessionRow>();
  const callByTableId = new Map<string, SalonCallRow>();

  for (const session of input.sessions) {
    const current = sessionByTableId.get(session.table_id);
    if (
      !current ||
      new Date(session.opened_at).getTime() > new Date(current.opened_at).getTime()
    ) {
      sessionByTableId.set(session.table_id, session);
    }
  }

  for (const call of input.calls) {
    const current = callByTableId.get(call.table_id);
    if (
      !current ||
      new Date(call.created_at).getTime() > new Date(current.created_at).getTime()
    ) {
      callByTableId.set(call.table_id, call);
    }
  }

  return input.tables.map((table) => {
    const zone = table.zone_id ? zoneById.get(table.zone_id) ?? null : null;
    const activeSession = sessionByTableId.get(table.id) ?? null;
    const activeCall = callByTableId.get(table.id) ?? null;

    return {
      ...table,
      zoneName: zone?.name ?? null,
      zoneColor: zone?.color ?? null,
      activeSession,
      activeCall,
      uiStatus: deriveTableUiStatus(table, activeSession, activeCall),
    };
  });
}

export function sortCalls(calls: SalonCallRow[]): SalonCallRow[] {
  const priorityWeight: Record<SalonCallRow["priority"], number> = {
    critical: 3,
    high: 2,
    normal: 1,
  };

  return [...calls].sort((a, b) => {
    const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (weightDiff !== 0) return weightDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
