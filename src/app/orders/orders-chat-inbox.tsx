"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type ConversationRow = {
  id: string;
  order_id: string;
  site_id: string;
  client_id: string;
  status: string;
  last_message_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  order_id: string;
  site_id: string;
  author_id: string;
  author_type: "client" | "staff" | "system";
  body: string;
  created_at: string;
};

type OrderRow = {
  id: string;
  status: string | null;
  guest_info: Record<string, unknown> | null;
  contact_phone: string | null;
};

type UnreadRow = {
  order_id: string;
  conversation_id: string;
  unread_count: number | string | null;
  latest_message_at?: string | null;
};

type InboxItem = {
  conversation: ConversationRow;
  order: OrderRow | null;
  unreadCount: number;
};

type LiveState = "connecting" | "live" | "offline";

function formatDate(value: string | null) {
  if (!value) return "Sin mensajes";

  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Bogota",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function orderCode(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}

function statusLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    preparing: "Preparando",
    ready_for_dispatch: "Listo despacho",
    in_transit: "En camino",
    on_the_way: "En camino",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };

  return value ? labels[value] || value : "Sin estado";
}

function conversationStatusLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    waiting_client: "Esperando cliente",
    waiting_staff: "Requiere respuesta",
    open: "Abierto",
    active: "Activo",
    closed: "Cerrado",
    resolved: "Resuelto",
  };

  return value ? labels[value] || value : "Sin estado";
}

function readGuestName(guestInfo: Record<string, unknown> | null) {
  if (!guestInfo) return null;

  const directKeys = ["full_name", "name", "customer_name", "client_name"];
  for (const key of directKeys) {
    const value = guestInfo[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const gift = guestInfo.gift;
  if (gift && typeof gift === "object" && !Array.isArray(gift)) {
    const recipientName = (gift as Record<string, unknown>).recipient_name;
    if (typeof recipientName === "string" && recipientName.trim()) {
      return recipientName.trim();
    }
  }

  return null;
}

function sortMessages(messages: MessageRow[]) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function upsertMessage(messages: MessageRow[], next: MessageRow) {
  if (messages.some((message) => message.id === next.id)) {
    return sortMessages(
      messages.map((message) => (message.id === next.id ? next : message)),
    );
  }

  return sortMessages([...messages, next]);
}

export function OrdersChatInbox({ siteId }: { siteId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [panelOpen, setPanelOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationRow | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState("");
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState>("connecting");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const selectedOrderIdRef = useRef<string | null>(null);
  const panelOpenRef = useRef(false);

  const totalUnread = useMemo(
    () => items.reduce((sum, item) => sum + item.unreadCount, 0),
    [items],
  );

  const selectedItem = useMemo(
    () => items.find((item) => item.conversation.order_id === selectedOrderId) ?? null,
    [items, selectedOrderId],
  );

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id ?? null;
  }, [selectedConversation?.id]);

  useEffect(() => {
    selectedOrderIdRef.current = selectedOrderId;
  }, [selectedOrderId]);

  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);

  const markRead = useCallback(
    async (conversationId: string, orderId: string) => {
      const { error: readError } = await supabase.rpc("mark_order_conversation_read", {
        p_conversation_id: conversationId,
      });

      if (readError) {
        console.warn("No se pudo marcar el chat como leído:", readError.message);
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.conversation.order_id === orderId ? { ...item, unreadCount: 0 } : item,
        ),
      );
    },
    [supabase],
  );

  const loadInbox = useCallback(async () => {
    if (!siteId) return;

    const [conversationsResult, unreadResult] = await Promise.all([
      supabase
        .from("order_conversations")
        .select("id,order_id,site_id,client_id,status,last_message_at")
        .eq("site_id", siteId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(40),
      supabase.rpc("get_staff_order_chat_unread_counts", { p_site_id: siteId }),
    ]);

    if (conversationsResult.error) {
      setError(conversationsResult.error.message);
      setLoadingInbox(false);
      return;
    }

    if (unreadResult.error) {
      console.warn("No se pudieron cargar mensajes pendientes:", unreadResult.error.message);
    }

    const conversations = (conversationsResult.data || []) as ConversationRow[];
    const unreadMap = new Map<string, number>();
    ((unreadResult.data || []) as UnreadRow[]).forEach((row) => {
      unreadMap.set(row.order_id, Number(row.unread_count || 0));
    });

    const orderIds = conversations.map((conversation) => conversation.order_id);
    let ordersById = new Map<string, OrderRow>();

    if (orderIds.length > 0) {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id,status,guest_info,contact_phone")
        .in("id", orderIds);

      if (orderError) {
        console.warn("No se pudieron cargar los pedidos de los chats:", orderError.message);
      } else {
        ordersById = new Map(
          ((orderData || []) as OrderRow[]).map((order) => [order.id, order]),
        );
      }
    }

    const nextItems = conversations
      .map((conversation) => ({
        conversation,
        order: ordersById.get(conversation.order_id) ?? null,
        unreadCount: unreadMap.get(conversation.order_id) || 0,
      }))
      .sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
        return (
          new Date(b.conversation.last_message_at || 0).getTime() -
          new Date(a.conversation.last_message_at || 0).getTime()
        );
      });

    setItems(nextItems);
    setLoadingInbox(false);
    setError(null);

    const currentOrderId = selectedOrderIdRef.current;
    if (currentOrderId) {
      const current = nextItems.find(
        (item) => item.conversation.order_id === currentOrderId,
      );
      if (current) {
        setSelectedConversation(current.conversation);
        setSelectedOrder(current.order);
      }
    }
  }, [siteId, supabase]);

  const loadMessages = useCallback(
    async (conversationId: string, markAsRead = false) => {
      const { data, error: loadError } = await supabase
        .from("order_messages")
        .select("id,conversation_id,order_id,site_id,author_id,author_type,body,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(250);

      if (loadError) {
        setError(loadError.message);
        setLoadingChat(false);
        return;
      }

      setMessages(sortMessages((data || []) as MessageRow[]));
      setLoadingChat(false);
      setError(null);

      const orderId = selectedOrderIdRef.current;
      if (markAsRead && orderId) {
        await markRead(conversationId, orderId);
      }
    },
    [markRead, supabase],
  );

  const openConversation = useCallback(
    async (item: InboxItem) => {
      setPanelOpen(true);
      setSelectedOrderId(item.conversation.order_id);
      setSelectedConversation(item.conversation);
      setSelectedOrder(item.order);
      setMessages([]);
      setBody("");
      setLoadingChat(true);
      await loadMessages(item.conversation.id, true);
    },
    [loadMessages],
  );


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

  const closeConversation = () => {
    setSelectedOrderId(null);
    setSelectedConversation(null);
    setSelectedOrder(null);
    setMessages([]);
    setBody("");
    setError(null);
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = body.trim();
    if (!text || !selectedConversation || !selectedOrderId || sending) return;

    setSending(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError("La sesión no está disponible para enviar el mensaje.");
      setSending(false);
      return;
    }

    const { data, error: sendError } = await supabase
      .from("order_messages")
      .insert({
        conversation_id: selectedConversation.id,
        order_id: selectedOrderId,
        site_id: siteId,
        author_id: authData.user.id,
        author_type: "staff",
        body: text,
      })
      .select("id,conversation_id,order_id,site_id,author_id,author_type,body,created_at")
      .single();

    if (sendError) {
      setError(sendError.message);
      setSending(false);
      return;
    }

    const message = data as MessageRow;
    setMessages((current) => upsertMessage(current, message));
    setBody("");
    setSending(false);
    await markRead(selectedConversation.id, selectedOrderId);
    void loadInbox();

    const { error: notifyError } = await supabase.functions.invoke("order-message-notify", {
      body: { message_id: message.id },
    });

    if (notifyError) {
      console.warn("El mensaje se envió, pero la notificación falló:", notifyError.message);
    }
  };

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!siteId) return;

    setLiveState("connecting");

    const channel = supabase
      .channel(`pulso-chat-inbox:${siteId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_messages",
          filter: `site_id=eq.${siteId}`,
        },
        (payload) => {
          const message = payload.new as MessageRow;
          const isSelected =
            panelOpenRef.current &&
            selectedConversationIdRef.current === message.conversation_id;

          if (isSelected) {
            setMessages((current) => upsertMessage(current, message));
            if (message.author_type === "client") {
              void markRead(message.conversation_id, message.order_id);
            }
          }

          void loadInbox();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_conversations",
          filter: `site_id=eq.${siteId}`,
        },
        () => {
          void loadInbox();
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
        () => {
          void loadInbox();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLiveState("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setLiveState("offline");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadInbox, markRead, siteId, supabase]);

  useEffect(() => {
    if (!panelOpen) return;

    const interval = window.setInterval(() => {
      void loadInbox();
      const conversationId = selectedConversationIdRef.current;
      if (conversationId) void loadMessages(conversationId, false);
    }, 8000);

    const syncOnFocus = () => {
      void loadInbox();
      const conversationId = selectedConversationIdRef.current;
      if (conversationId) void loadMessages(conversationId, false);
    };

    window.addEventListener("focus", syncOnFocus);
    document.addEventListener("visibilitychange", syncOnFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncOnFocus);
      document.removeEventListener("visibilitychange", syncOnFocus);
    };
  }, [loadInbox, loadMessages, panelOpen]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const selectedClosed =
    selectedOrder?.status === "delivered" || selectedOrder?.status === "cancelled";
  const LiveIcon = liveState === "live" ? Wifi : WifiOff;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPanelOpen(true);
          void loadInbox();
        }}
        className="fixed bottom-5 right-5 z-[110] inline-flex h-14 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-2xl transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-cyan-200"
        aria-label={`Abrir chats de pedidos${totalUnread ? `, ${totalUnread} pendientes` : ""}`}
      >
        <MessageCircle className="h-5 w-5" />
        Chats
        {totalUnread > 0 ? (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-black text-white">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        ) : null}
      </button>

      {panelOpen ? (
        <div className="fixed inset-0 z-[130] bg-slate-950/45 backdrop-blur-[2px]" role="presentation">
          <section className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                {selectedConversation ? (
                  <button
                    type="button"
                    onClick={closeConversation}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                    aria-label="Volver a chats"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="truncate text-base font-black text-slate-950">
                    {selectedConversation
                      ? `Pedido #${orderCode(selectedConversation.order_id)}`
                      : "Chats de pedidos"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <LiveIcon className="h-3.5 w-3.5" />
                    {liveState === "live"
                      ? "Actualización en vivo"
                      : liveState === "connecting"
                        ? "Conectando"
                        : "Reconectando"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void loadInbox();
                    if (selectedConversation) void loadMessages(selectedConversation.id, false);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
                  aria-label="Sincronizar chats"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPanelOpen(false);
                    closeConversation();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
                  aria-label="Cerrar chats"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {!selectedConversation ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {totalUnread > 0 ? (
                  <div className="mb-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                    <div className="text-sm font-black text-cyan-950">
                      {totalUnread} mensaje{totalUnread === 1 ? "" : "s"} pendiente{totalUnread === 1 ? "" : "s"}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-cyan-700">
                      Los chats sin responder aparecen primero.
                    </div>
                  </div>
                ) : null}

                {loadingInbox ? (
                  <div className="flex min-h-52 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando chats
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
                    <MessageCircle className="h-8 w-8 text-slate-300" />
                    <div className="mt-3 text-sm font-black text-slate-800">Sin conversaciones</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Los chats aparecerán aquí cuando un cliente abra una conversación.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => {
                      const guestName = readGuestName(item.order?.guest_info ?? null);
                      return (
                        <button
                          key={item.conversation.id}
                          type="button"
                          onClick={() => void openConversation(item)}
                          className={`w-full rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition hover:border-cyan-300 hover:shadow-md ${
                            item.unreadCount > 0
                              ? "border-cyan-400 ring-2 ring-cyan-100"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-black text-slate-950">
                                  #{orderCode(item.conversation.order_id)}
                                </div>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-black text-slate-600">
                                  {statusLabel(item.order?.status)}
                                </span>
                              </div>
                              <div className="mt-1 truncate text-sm font-semibold text-slate-700">
                                {guestName || item.order?.contact_phone || "Cliente"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {conversationStatusLabel(item.conversation.status)} · {formatDate(item.conversation.last_message_at)}
                              </div>
                            </div>

                            {item.unreadCount > 0 ? (
                              <span className="inline-flex min-w-7 shrink-0 items-center justify-center rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">
                                {item.unreadCount > 99 ? "99+" : item.unreadCount}
                              </span>
                            ) : (
                              <MessageCircle className="mt-1 h-5 w-5 shrink-0 text-slate-300" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-950">
                        {readGuestName(selectedOrder?.guest_info ?? null) || selectedOrder?.contact_phone || "Cliente"}
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-slate-500">
                        {statusLabel(selectedOrder?.status)} · {conversationStatusLabel(selectedConversation.status)}
                      </div>
                    </div>
                    {selectedItem?.unreadCount ? (
                      <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                        {selectedItem.unreadCount} pendiente{selectedItem.unreadCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div
                  ref={scrollRef}
                  className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-100 p-4"
                >
                  {loadingChat ? (
                    <div className="flex min-h-52 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando conversación
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex min-h-52 items-center justify-center text-center text-sm text-slate-500">
                      Sin mensajes todavía.
                    </div>
                  ) : (
                    messages.map((message) => {
                      const mine = message.author_type === "staff";
                      return (
                        <div
                          key={message.id}
                          className={`rounded-2xl border px-3 py-2.5 ${
                            mine
                              ? "ml-8 border-cyan-200 bg-cyan-50"
                              : "mr-8 border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-400">
                            <span>{mine ? "Pulso" : message.author_type === "client" ? "Cliente" : "Sistema"}</span>
                            <span>{formatDate(message.created_at)}</span>
                          </div>
                          <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                            {message.body}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {error ? (
                  <div className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800">
                    {error}
                  </div>
                ) : null}

                <form onSubmit={sendMessage} className="shrink-0 border-t border-slate-200 bg-white p-3">
                  {selectedClosed ? (
                    <div className="rounded-xl bg-slate-100 px-3 py-3 text-center text-xs font-semibold text-slate-500">
                      El chat está cerrado porque el pedido finalizó.
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <textarea
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        placeholder="Responder al cliente"
                        rows={2}
                        maxLength={600}
                        className="min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={sending || !body.trim()}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Enviar mensaje"
                      >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </button>
                    </div>
                  )}
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
