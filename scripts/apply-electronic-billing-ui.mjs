import fs from 'node:fs';

function replaceOnce(source, needle, replacement, label) {
  if (!source.includes(needle)) {
    throw new Error(`No se encontro el bloque requerido: ${label}`);
  }
  return source.replace(needle, replacement);
}

function patchPage() {
  const path = 'src/app/orders/page.tsx';
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes('type OrderBillingRequestRow = {')) return;

  source = replaceOnce(source,
`type OrderItemRow = {`,
`type OrderBillingRequestRow = {
  id: string;
  order_id: string;
  client_id: string;
  site_id: string;
  legal_name: string;
  document_type: string;
  document_number: string;
  verification_digit: string | null;
  billing_email: string;
  status: string;
  provider: string | null;
  provider_reference: string | null;
  invoice_number: string | null;
  cufe: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  error_message: string | null;
  requested_at: string;
  submitted_at: string | null;
  issued_at: string | null;
};

type OrderItemRow = {`, 'page billing type');

  source = replaceOnce(source,
`  let orderItemsByOrder: Record<string, OrderItemView[]> = {};
  let orderItemsError: string | null = null;`,
`  let billingByOrder: Record<string, OrderBillingRequestRow> = {};
  let billingError: string | null = null;
  let orderItemsByOrder: Record<string, OrderItemView[]> = {};
  let orderItemsError: string | null = null;`, 'page billing state');

  source = replaceOnce(source,
`  if (orderIds.length > 0) {
    const { data: orderItemsData, error: itemsError } = await supabase`,
`  if (orderIds.length > 0) {
    const { data: billingData, error: billingFetchError } = await supabase
      .from("order_billing_requests")
      .select(
        "id,order_id,client_id,site_id,legal_name,document_type,document_number,verification_digit,billing_email,status,provider,provider_reference,invoice_number,cufe,pdf_url,xml_url,error_message,requested_at,submitted_at,issued_at"
      )
      .in("order_id", orderIds);

    if (billingFetchError) {
      billingError = billingFetchError.message;
    } else {
      billingByOrder = Object.fromEntries(
        ((billingData ?? []) as OrderBillingRequestRow[]).map((billing) => [billing.order_id, billing])
      );
    }

    const { data: orderItemsData, error: itemsError } = await supabase`, 'page billing query');

  source = replaceOnce(source,
`      order,
      items,`,
`      order,
      billing: billingByOrder[order.id] ?? null,
      items,`, 'page board billing');

  source = replaceOnce(source,
`      {orderMessagesError ? (
        <div className="ui-alert ui-alert--warn">No se pudo cargar el chat: {orderMessagesError}</div>
      ) : null}
`,
`      {orderMessagesError ? (
        <div className="ui-alert ui-alert--warn">No se pudo cargar el chat: {orderMessagesError}</div>
      ) : null}
      {billingError ? (
        <div className="ui-alert ui-alert--warn">No se pudieron cargar los datos de facturación: {billingError}</div>
      ) : null}
`, 'page billing alert');

  fs.writeFileSync(path, source);
}

function patchBoard() {
  const path = 'src/app/orders/orders-board.tsx';
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes('type OrderBillingRequest = {')) return;

  source = replaceOnce(source,
`  Phone,
  Store,`,
`  Phone,
  ReceiptText,
  Store,`, 'board receipt icon');

  source = replaceOnce(source,
`type UnreadRow = {
  order_id: string;
  conversation_id: string;
  unread_count: number | string | null;
};`,
`type UnreadRow = {
  order_id: string;
  conversation_id: string;
  unread_count: number | string | null;
};

type OrderBillingRequest = {
  id: string;
  order_id: string;
  client_id: string;
  site_id: string;
  legal_name: string;
  document_type: string;
  document_number: string;
  verification_digit: string | null;
  billing_email: string;
  status: string;
  provider: string | null;
  provider_reference: string | null;
  invoice_number: string | null;
  cufe: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  error_message: string | null;
  requested_at: string;
  submitted_at: string | null;
  issued_at: string | null;
};`, 'board billing type');

  source = replaceOnce(source,
`  order: OrderRow;
  items: OrderItemView[];`,
`  order: OrderRow;
  billing: OrderBillingRequest | null;
  items: OrderItemView[];`, 'board billing property');

  source = replaceOnce(source,
`function ActionIcon({ op }: { op: OpsAction }) {`,
`function billingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    requested: "Solicitada",
    ready_to_issue: "Lista para emitir",
    submitted: "Enviada al proveedor",
    issued: "Emitida",
    failed: "Con error",
    cancelled: "Cancelada",
  };
  return labels[status] || status;
}

function billingStatusTone(status: string) {
  if (status === "issued" || status === "ready_to_issue") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "failed" || status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function ActionIcon({ op }: { op: OpsAction }) {`, 'board billing helpers');

  source = replaceOnce(source,
`      </div>

      <div className="mt-4 min-h-[46px] space-y-1">`,
`      </div>

      {data.billing ? (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700">
          <ReceiptText className="h-3.5 w-3.5" />
          Factura electrónica
        </div>
      ) : null}

      <div className="mt-4 min-h-[46px] space-y-1">`, 'board card billing badge');

  source = replaceOnce(source,
`  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ModalTab>("order");
  const [unreadByOrder, setUnreadByOrder] = useState<Record<string, number>>({});`,
`  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ModalTab>("order");
  const [billingDetailsOpen, setBillingDetailsOpen] = useState(false);
  const [unreadByOrder, setUnreadByOrder] = useState<Record<string, number>>({});`, 'board billing modal state');

  source = replaceOnce(source,
`  const totalUnread = useMemo(`,
`  const selectedBilling = selected?.billing ?? null;

  const totalUnread = useMemo(`, 'board selected billing');

  source = replaceOnce(source,
`    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedOrderId(null);
    };`,
`    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (billingDetailsOpen) {
        setBillingDetailsOpen(false);
        return;
      }
      setSelectedOrderId(null);
    };`, 'board escape nested modal');

  source = replaceOnce(source,
`  }, [selected]);`,
`  }, [billingDetailsOpen, selected]);`, 'board escape deps');

  source = replaceOnce(source,
`  const openOrder = (orderId: string) => {
    setActiveTab("order");
    setSelectedOrderId(orderId);
  };`,
`  const closeOrderModal = () => {
    setBillingDetailsOpen(false);
    setSelectedOrderId(null);
  };

  const openOrder = (orderId: string) => {
    setBillingDetailsOpen(false);
    setActiveTab("order");
    setSelectedOrderId(orderId);
  };`, 'board close modal');

  source = source.replaceAll('setSelectedOrderId(null)', 'closeOrderModal()');
  source = source.replace(
`  const closeOrderModal = () => {
    setBillingDetailsOpen(false);
    closeOrderModal();
  };`,
`  const closeOrderModal = () => {
    setBillingDetailsOpen(false);
    setSelectedOrderId(null);
  };`);
  source = source.replace(
`      closeOrderModal();
    };`,
`      setSelectedOrderId(null);
    };`);

  source = replaceOnce(source,
`                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        {selected.order.fulfillment_type === "delivery" ?`,
`                    </section>

                    {selected.billing ? (
                      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                            <div>
                              <div className="text-sm font-black text-violet-950">Facturación electrónica</div>
                              <div className="mt-1 text-xs font-semibold text-violet-700">
                                {billingStatusLabel(selected.billing.status)}
                              </div>
                            </div>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${billingStatusTone(selected.billing.status)}`}>
                            {billingStatusLabel(selected.billing.status)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBillingDetailsOpen(true)}
                          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-black text-white transition hover:bg-violet-800"
                        >
                          <ReceiptText className="h-4 w-4" />
                          Datos de facturación
                        </button>
                      </section>
                    ) : null}

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        {selected.order.fulfillment_type === "delivery" ?`, 'board billing section');

  source = replaceOnce(source,
`      ) : null}
    </>
  );
}`,
`      ) : null}

      {selectedBilling && billingDetailsOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setBillingDetailsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-modal-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="billing-modal-title" className="text-lg font-black text-slate-950">Datos de facturación</h3>
                  <div className="mt-1 text-sm text-slate-500">Pedido #{selected?.orderCode}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBillingDetailsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                aria-label="Cerrar datos de facturación"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-bold text-slate-600">Estado</div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${billingStatusTone(selectedBilling.status)}`}>
                  {billingStatusLabel(selectedBilling.status)}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">Nombre o razón social</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{selectedBilling.legal_name}</div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">Identificación</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {selectedBilling.document_type} {selectedBilling.document_number}
                    {selectedBilling.verification_digit ? `-${selectedBilling.verification_digit}` : ""}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">Correo</div>
                  <div className="mt-1 break-all text-sm font-bold text-slate-900">{selectedBilling.billing_email}</div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">Solicitada</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{formatDate(selectedBilling.requested_at)}</div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">Proveedor</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{selectedBilling.provider || "Pendiente de integración"}</div>
                </div>
              </div>

              {selectedBilling.invoice_number || selectedBilling.cufe ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  {selectedBilling.invoice_number ? (
                    <div className="text-sm font-bold text-emerald-900">Factura: {selectedBilling.invoice_number}</div>
                  ) : null}
                  {selectedBilling.cufe ? (
                    <div className="mt-1 break-all text-xs font-semibold text-emerald-700">CUFE: {selectedBilling.cufe}</div>
                  ) : null}
                </div>
              ) : null}

              {selectedBilling.error_message ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  Error: {selectedBilling.error_message}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}`,
'board billing details modal');

  fs.writeFileSync(path, source);
}

patchPage();
patchBoard();
