import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
export const Route = createRootRoute({
 component: () => <AppShell><Outlet /></AppShell>,
 errorComponent: ({reset}) => <section className="card-surface space-y-3 p-5"><h1 className="text-xl font-bold">Não foi possível abrir esta página</h1><p>Recarregue o módulo para tentar novamente. Você também pode exportar seu progresso em Meus dados.</p><button className="btn btn-primary" onClick={reset}>Tentar novamente</button><a className="btn btn-ghost" href="/dados">Meus dados</a></section>,
 notFoundComponent: () => <main className="p-8"><h1>Página não encontrada</h1><a href="/">Voltar ao início</a></main>,
});