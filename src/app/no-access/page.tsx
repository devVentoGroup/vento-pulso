import Link from "next/link";

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="ui-panel w-full max-w-xl text-center">
        <h1 className="ui-h2">Sin acceso</h1>
        <p className="mt-3 ui-body-muted">
          Tu usuario no tiene permisos para abrir este módulo en la sede seleccionada.
        </p>
        <div className="mt-6">
          <Link href="/" className="ui-btn ui-btn--primary">
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
