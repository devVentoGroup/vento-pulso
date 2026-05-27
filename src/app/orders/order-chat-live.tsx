"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";

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
    | {
        ok: true;
        message: OrderMessageRow;
    }
    | {
        ok: false;
        error: string;
    };

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
        }).format(new Date(value));
    } catch {
        return value;
    }
}

function sortMessages(messages: ChatMessage[]) {
    return [...messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}

function upsertMessage(current: ChatMessage[], next: ChatMessage) {
    const exists = current.some((message) => message.id === next.id);

    if (exists) {
        return sortMessages(
            current.map((message) => (message.id === next.id ? { ...message, ...next } : message))
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
    const [chatOpen, setChatOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const closed = orderStatus === "delivered" || orderStatus === "cancelled";

    const latestMessage = useMemo(() => {
        return messages[messages.length - 1] || null;
    }, [messages]);

    const latestMessageAt = useMemo(() => {
        return latestMessage?.created_at || conversation?.last_message_at || null;
    }, [conversation?.last_message_at, latestMessage]);

    const previewText = latestMessage
        ? `${senderLabel(latestMessage)}: ${latestMessage.body}`
        : "Sin mensajes todavía.";

    useEffect(() => {
        setMessages(sortMessages(initialMessages));
    }, [conversation?.id, initialMessages]);

    useEffect(() => {
        if (!conversation?.id) return;

        const supabase = createClient();

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
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [conversation?.id]);

    useEffect(() => {
        const node = scrollRef.current;
        if (!node) return;

        node.scrollTo({
            top: node.scrollHeight,
            behavior: "smooth",
        });
    }, [messages.length]);

    if (!conversation) {
        return (
            <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-3">
                <div className="ui-label">Chat con cliente</div>
                <div className="mt-1 ui-caption">El cliente aún no ha abierto el chat de este pedido.</div>
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
            }).then((result) => {
                if (!result.ok) {
                    setError(result.error || "No pudimos enviar el mensaje.");
                    setMessages((current) =>
                        current.map((message) =>
                            message.id === pendingId
                                ? {
                                    ...message,
                                    pending: false,
                                    failed: true,
                                }
                                : message
                        )
                    );
                    return;
                }

                setMessages((current) => upsertMessage(current, result.message));
            });
        });
    };

    return (
        <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div className="ui-label">Chat con cliente</div>
                    <div className="ui-caption">
                        Estado: {conversationStatusLabel(conversation.status)}
                        <span className="ml-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            En vivo
                        </span>
                    </div>
                </div>

                {latestMessageAt ? (
                    <div className="ui-caption">Último: {formatDate(latestMessageAt)}</div>
                ) : null}
            </div>

            {!chatOpen ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2">
                        <div className="ui-caption">Último mensaje</div>
                        <div className="ui-body truncate text-sm">{previewText}</div>
                    </div>

                    <button
                        type="button"
                        className="ui-btn ui-btn--ghost h-9 px-3 text-sm"
                        onClick={() => setChatOpen(true)}
                    >
                        Abrir chat
                    </button>
                </div>
            ) : (
                <div className="mt-3 space-y-3">
                    <div
                        ref={scrollRef}
                        className="max-h-64 space-y-2 overflow-auto pr-1 ui-scrollbar-subtle"
                    >
                        {messages.length === 0 ? (
                            <div className="ui-caption">Sin mensajes todavía.</div>
                        ) : (
                            messages.slice(-24).map((message) => {
                                const mine = message.author_type === "staff";

                                return (
                                    <div
                                        key={message.id}
                                        className={`rounded-xl border px-3 py-2 ${mine
                                                ? "ml-8 border-cyan-200 bg-cyan-50"
                                                : "mr-8 border-[var(--ui-border)] bg-[var(--ui-surface)]"
                                            } ${message.failed ? "border-red-200 bg-red-50" : ""}`}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="ui-caption font-semibold">
                                                {senderLabel(message)}
                                                {message.pending ? " · enviando..." : ""}
                                                {message.failed ? " · no enviado" : ""}
                                            </div>
                                            <div className="ui-caption">{formatDate(message.created_at)}</div>
                                        </div>

                                        <div className="mt-1 ui-body text-sm">{message.body}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {error ? <div className="ui-alert ui-alert--error">{error}</div> : null}

                    {!closed ? (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
                            <input
                                className="ui-input min-h-9 flex-1"
                                value={body}
                                onChange={(event) => setBody(event.target.value)}
                                placeholder="Responder al cliente"
                                maxLength={600}
                            />

                            <button
                                type="submit"
                                className="ui-btn ui-btn--primary h-9 px-3 text-sm"
                                disabled={isPending || !body.trim()}
                            >
                                <Send className="h-4 w-4" />
                                Enviar
                            </button>

                            <button
                                type="button"
                                className="ui-btn ui-btn--ghost h-9 px-3 text-sm"
                                onClick={() => setChatOpen(false)}
                            >
                                Cerrar
                            </button>
                        </form>
                    ) : (
                        <div className="ui-caption">El chat está cerrado porque el pedido ya finalizó.</div>
                    )}
                </div>
            )}
        </div>
    );
}