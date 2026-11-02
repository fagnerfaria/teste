import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
export const Route = createRootRoute({
 component: () => <AppShell><Outlet /></AppShell>,
 notFoundComponent: () => <main className="p-8"><h1>Página não encontrada</h1><a href="/">Voltar ao início</a></main>,
});