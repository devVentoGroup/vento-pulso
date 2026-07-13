from pathlib import Path


bridge_path = Path("src/app/orders/orders-live-bridge.tsx")
source = bridge_path.read_text(encoding="utf-8")

import_line = 'import { OrdersChatInbox } from "./orders-chat-inbox";'
if import_line not in source:
    anchor = 'import { createClient } from "@/lib/supabase/client";'
    if anchor not in source:
        raise RuntimeError("No se encontró el import de Supabase en orders-live-bridge.tsx")
    source = source.replace(anchor, anchor + "\n" + import_line, 1)

mount_line = "      <OrdersChatInbox siteId={siteId} />"
if mount_line not in source:
    closing = "    </div>\n  );\n}"
    if closing not in source:
        raise RuntimeError("No se encontró el cierre del bridge live")
    source = source.replace(
        closing,
        "      <OrdersChatInbox siteId={siteId} />\n" + closing,
        1,
    )

bridge_path.write_text(source, encoding="utf-8")
