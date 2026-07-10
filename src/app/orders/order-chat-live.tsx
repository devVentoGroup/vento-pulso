"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Send, Wifi, WifiOff } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type OrderConversationRow = {
  id: string;
  order_id: string;
  site_id: string;
  client_id: string;
  status: string;
  last_message_at: string | null;
};

type OrderMessageRow = {
  id: string;
  conversation_id: string;
  order_id: string;
  site_id: string;
  author_id: string;
  author_type: "client" | "staff" | "system";
  body: string;
  created_at: string;
};

type ChatMessage = OrderMessageRow & {
  pending?: boolean;
  failed?: boolean;
};

type SendMessageResult =
  | { ok: true; message: OrderMessageRow }
  | { ok: false; error: string };

type OrderChatLiveProps = {
  conversation: OrderConversationRow | null;
  initialMessages: OrderMessageRow[];
  orderId: string;
  orderStatus: string | null;
  siteId: string;
  sendMessageAction: (input: {
    conversationId: string;
    orderId: string;
    siteId: string;
    body: string;
  }) => Promise<SendMessageResult>;
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Bogota",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function upsertMessage(current: ChatMessage[], next: ChatMessage) {
  const exists = current.some((message) => message.id === next.id);

  if (exists) {
    return sortMessages(
      current.map((message) => (message.id === next.id ? { ...message, ...next } : message)),
    );
  }

  const withoutMatchingPending = current.filter((message) => {
    if (!message.pending) return true;
    if (message.author_type !== next.author_type) return true;
    if (message.body !== next.body) return true;

    const pendingTime = new Date(message.created_at).getTime();
    const nextTime = new Date(next.created_at).getTime();
    return Math.abs(nextTime - pendingTime) > 60_000;
  });

  return sortMessages([...withoutMatchingPending, next]);
}

function senderLabel(message: ChatMessage) {
  if (message.author_type === "staff") return "Pulso";
  if (message.author_type === "client") return "Cliente";
  return "Sistema";
}

const CONVERSATION_STATUS_LABELS: Record<string, string> = {
  waiting_client: "Esperando cliente",
  waiting_staff: "Esperando equipo",
  open: "Abierto",
  active: "Activo",
  closed: "Cerrado",
  resolved: "Resuelto",
};

function conversationStatusLabel(value: string | null | undefined) {
  if (!value) return "Sin estado";
  return CONVERSATION_STATUS_LABELS[value] || value;
}

export function OrderChatLive({
  conversation,
  initialMessages,
  orderId,
  orderStatus,
  siteId,
  sendMessageAction,
}: OrderChatLiveProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => sortMessages(initialMessages));
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<"connecting" | "live" | "offline">(
    "connecting",
  );
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const closed = orderStatus === "delivered" || orderStatus === "cancelled";

  const markRead = useCallback(async () => {
    if (!conversation?.id) return;
    const { error: readError } = await supabase.rpc("mark_order_conversation_read", {
      p_conversation_id: conversation.id,
    });
    if (readError) console.warn("No se pudo marcar el chat como leído:", readError.message);
  }, [conversation?.id, supabase]);

  const loadCurrentMessages = useCallback(async () => {
    if (!conversation?.id) return;

    const { data, error: loadError } = await supabase
      .from("order_messages")
      .select("id,conversation_id,order_id,site_id,author_id,author_type,body,created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setMessages(sortMessages((data || []) as OrderMessageRow[]));
    await markRead();
  }, [conversation?.id, markRead, supabase]);

  const latestMessage = messages[messages.length - 1] || null;
  const latestMessageAt = latestMessage?.created_at || conversation?.last_message_at || null;

  useEffect(() => {
    setMessages(sortMessages(initialMessages));
  }, [conversation?.id, initialMessages]);

  useEffect(() => {
    void loadCurrentMessages();
  }, [loadCurrentMessages]);

  useEffect(() => {
    if (!conversation?.id) return;

    setRealtimeState("connecting");

    const channel = supabase
      .channel(`order-chat:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const next = payload.new as OrderMessageRow;
          setMessages((current) => upsertMessage(current, next));
          if (next.author_type === "client") void markRead();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeState("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeState("offline");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversation?.id, markRead, supabase]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (!conversation) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
        <div className="text-sm font-black text-slate-950">Chat con cliente</div>
        <div className="mt-1 text-sm text-slate-500">
          El cliente aún no ha abierto el chat de este pedido.
        </div>
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = body.trim();
    if (!text || isPending || closed) return;

    setError(null);
    setBody("");

    const pendingId = `pending-${Date.now()}`;
    const pendingMessage: ChatMessage = {
      id: pendingId,
      conversation_id: conversation.id,
      order_id: orderId,
      site_id: siteId,
      author_id: "staff",
      author_type: "staff",
      body: text,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setMessages((current) => upsertMessage(current, pendingMessage));

    startTransition(() => {
      void sendMessageAction({
        conversationId: conversation.id,
        orderId,
        siteId,
        body: text,
      }).then(async (result) => {
        if (!result.ok) {
          setError(result.error || "No pudimos enviar el mensaje.");
          setMessages((current) =>
            current.map((message) =>
              message.id === pendingId
                ? { ...message, pending: false, failed: true }
                : message,
            ),
          );
          return;
        }

        setMessages((current) => upsertMessage(current, result.message));
        await markRead();

        const { error: notifyError } = await supabase.functions.invoke("order-message-notify", {
          body: { message_id: result.message.id },
        });

        if (notifyError) {
          console.warn("El mensaje se envió, pero la notificación push falló:", notifyError.message);
        }
      });
    });
  };

  const live = realtimeState === "live";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-950">Chat con cliente</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            Estado: {conversationStatusLabel(conversation.status)}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {latestMessageAt ? (
            <div className="hidden text-xs text-slate-500 sm:block">
              Último: {formatDate(latestMessageAt)}
            </div>
          ) : null}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${
              live
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {live ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {live ? "En vivo" : realtimeState === "connecting" ? "Conectando" : "Reconectando"}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mt-4 max-h-[50vh] min-h-64 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center text-center text-sm text-slate-500">
            Sin mensajes todavía.
          </div>
        ) : (
          messages.slice(-100).map((message) => {
            const mine = message.author_type === "staff";

            return (
              <div
                key={message.id}
                className={`rounded-xl border px-3 py-2 ${
                  mine
                    ? "ml-8 border-cyan-200 bg-cyan-50"
                    : "mr-8 border-slate-200 bg-white"
                } ${message.failed ? "border-red-200 bg-red-50" : ""}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-500">
                    {senderLabel(message)}
                    {message.pending ? " · enviando..." : ""}
                    {message.failed ? " · no enviado" : ""}
                  </div>
                  <div className="text-xs text-slate-400">{formatDate(message.created_at)}</div>
                </div>
                <div className="mt-1 text-sm text-slate-900">{message.body}</div>
              </div>
            );
          })
        )}
      </div>

      {error ? <div className="ui-alert ui-alert--error mt-3">{error}</div> : null}

      {!closed ? (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="ui-input min-h-10 flex-1"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Responder al cliente"
            maxLength={600}
          />
          <button
            type="submit"
            className="ui-btn ui-btn--primary h-10 px-4 text-sm"
            disabled={isPending || !body.trim()}
          >
            <Send className="h-4 w-4" />
            Enviar
          </button>
        </form>
      ) : (
        <div className="mt-3 text-xs font-semibold text-slate-500">
          El chat está cerrado porque el pedido ya finalizó.
        </div>
      )}
    </div>
  );
}
