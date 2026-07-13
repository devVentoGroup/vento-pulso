from pathlib import Path


bridge_path = Path("src/app/orders/orders-live-bridge.tsx")
source = bridge_path.read_text(encoding="utf-8")

import_line = 'import { OrdersChatInbox } from "./orders-chat-inbox";'
if import_line not in source:
    anchor = 'import { createClient } from "@/lib/supabase/client";'
    if anchor not in source:
        raise RuntimeError("No se encontró el import de Supabase en orders-live-bridge.tsx")
    source = source.replace(anchor, anchor + "\n" + import_line, 1