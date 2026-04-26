export type SalonZoneRow = {
  id: string;
  site_id: string;
  name: string;
  color: string | null;
  display_order: number | null;
  is_active: boolean;
};

export type SalonTableRow = {
  id: string;
  site_id: string;
  zone_id: string | null;
  name: string;
  table_number: number | null;
  shape: string;
  capacity: number;
  position_x: number;
  position_y: number;
  rotation: number | null;
  width: number | null;
  height: number | null;
  is_active: boolean;
};

export type SalonSessionRow = {
  id: string;
  site_id: string;
  table_id: string;
  server_id: string | null;
  status: string;
  pax: number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
};

export type SalonCallRow = {
  id: string;
  site_id: string;
  zone_id: string | null;
  table_id: string;
  session_id: string | null;
  device_id: string | null;
  source_type: string;
  request_type: string;
  status: "pending" | "acknowledged" | "resolved" | "cancelled";
  priority: "normal" | "high" | "critical";
  notes: string | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  cancelled_at: string | null;
};

export type SalonTableStatus =
  | "attention_requested"
  | "bill_requested"
  | "ordering"
  | "occupied"
  | "available"
  | "blocked";

export type SalonTableView = SalonTableRow & {
  zoneName: string | null;
  zoneColor: string | null;
  activeSession: SalonSessionRow | null;
  activeCall: SalonCallRow | null;
  uiStatus: SalonTableStatus;
};

export type SalonSnapshot = {
  zones: SalonZoneRow[];
  tables: SalonTableRow[];
  sessions: SalonSessionRow[];
  calls: SalonCallRow[];
};
