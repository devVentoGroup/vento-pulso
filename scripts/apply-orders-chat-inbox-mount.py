from pathlib import Path


bridge_path = Path("src/app/orders/orders-live-bridge.tsx")
bridge = bridge_path.read_text(encoding="utf-8")

import_line = 'import { OrdersChatInbox } from "./orders-chat-inbox";'
if import_line not in bridge:
    anchor = 'import { createClient } from "@/lib/supabase/client";'
    if anchor not in bridge:
        raise RuntimeError("No se encontró el import de Supabase en orders-live-bridge.tsx")
    bridge = bridge.replace(anchor, anchor + "\n" + import_line, 1)

mount_line = "      <OrdersChatInbox siteId={siteId} />"
if mount_line not in bridge:
    closing = "    </div>\n  );\n}"
    if closing not in bridge:
        raise RuntimeError("No se encontró el cierre del bridge live")
    bridge = bridge.replace(
        closing,
        mount_line + "\n" + closing,
        1,
    )

bridge_path.write_text(bridge, encoding="utf-8")


inbox_path = Path("src/app/orders/orders-chat-inbox.tsx")
inbox = inbox_path.read_text(encoding="utf-8")

open_event_effect = '''
  useEffect(() => {
    const handleOpenOrderChat = (event: Event) => {
      const orderId = (event as CustomEvent<{ orderId?: string }>).detail?.orderId;
      setPanelOpen(true);
      if (!orderId) {
        void loadInbox();
        return;
      }

      const item = items.find((candidate) => candidate.conversation.order_id === orderId);
      if (item) {
        void openConversation(item);
        return;
      }

      void loadInbox();
    };

    window.addEventListener("vento-pulso:open-order-chat", handleOpenOrderChat);
    return () => window.removeEventListener("vento-pulso:open-order-chat", handleOpenOrderChat);
  }, [items, loadInbox, openConversation]);
'''

if 'window.addEventListener("vento-pulso:open-order-chat"' not in inbox:
    anchor = '''  const closeConversation = () => {
'''
    if anchor not in inbox:
        raise RuntimeError("No se encontró el punto de montaje del evento de chat")
    inbox = inbox.replace(anchor, open_event_effect + "\n" + anchor, 1)

inbox_path.write_text(inbox, encoding="utf-8")


board_path = Path("src/app/orders/orders-board-legacy.tsx")
board = board_path.read_text(encoding="utf-8")

if "vento-pulso:open-order-chat" not in board:
    old_block = '''      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {orders.map((entry) => (
          <OrderCard
            key={entry.order.id}
            data={entry}
            unreadCount={unreadByOrder[entry.order.id] || 0}
            onOpen={() => openOrder(entry.order.id)}
          />
        ))}
      </div>'''

    new_block = '''      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {orders.map((entry) => {
          const unreadCount = unreadByOrder[entry.order.id] || 0;
          return (
            <div key={entry.order.id} className="relative">
              <OrderCard
                data={entry}
                unreadCount={unreadCount}
                onOpen={() => openOrder(entry.order.id)}
              />
              {entry.conversation ? (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("vento-pulso:open-order-chat", {
                        detail: { orderId: entry.order.id },
                      }),
                    );
                  }}
                  className={`absolute bottom-3 right-3 z-10 inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-black shadow-lg transition ${
                    unreadCount > 0
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50"
                  }`}
                  aria-label={`Abrir chat del pedido ${entry.orderCode}`}
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat
                  {unreadCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>'''

    if old_block not in board:
        raise RuntimeError("No se encontró el grid de tarjetas para agregar el acceso directo al chat")
    board = board.replace(old_block, new_block, 1)

board_path.write_text(board, encoding="utf-8")
