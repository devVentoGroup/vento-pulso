"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { OrdersBoard as DecoratedOrdersBoard } from "./orders-board";

type OrdersBoardProps = ComponentProps<typeof DecoratedOrdersBoard>;
type OrderEntry = OrdersBoardProps["orders"][number];
type OrderRow = OrderEntry["order"];
type LiveOrderPatch = Pick<
  OrderRow,
  | "id"
  | "status"
  | "payment_status"
  | "dispatch_status"
  | "dispatch_partner"
  | "dispatch_reference"
>;

type LiveState = "connecting" | "live" | "offline";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
