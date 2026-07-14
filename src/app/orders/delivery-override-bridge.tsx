"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type TargetOrder = {
  orderId: string;
  siteId: string;
};

type Reason =
  | "client_without_pin"
  | "authorized_third_party"
  | "technical_failure"
  | "other";

const REASONS: Array<{ value: Reason; label: string }> = [
  { value: "client_without_pin", label: "Cliente sin acceso al PIN" },
  { value: "authorized_third_party", label: "Entrega a tercero autorizado" },
  { value: "technical_failure", label: "Falla técnica" },
  { value: "other", label: "Otro" },
];

export function DeliveryOverrideBridge() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const checkedOrdersRef = useRef<Map<string, boolean>>(new Map());
  const [target, setTarget] = useState<TargetOrder |