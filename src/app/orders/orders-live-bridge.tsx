"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Radio, Volume2, Wifi, WifiOff, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type LiveOrderRow = {
  id: string;
  site_id: string | null;
  status?: string | null;
  payment_status?: string | null;
  total_amount?: number | string | null