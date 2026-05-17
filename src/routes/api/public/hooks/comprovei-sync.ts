// Endpoint público chamado pelo pg_cron a cada 5 minutos.
// Itera por todos os motoristas com sync_active=true.
import { createFileRoute } from "@tanstack/react-router";
import { runAllDriversComproveiSync } from "@/lib/comprovei-driver.server";

export const Route = createFileRoute("/api/public/hooks/comprovei-sync")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await runAllDriversComproveiSync("auto");
          return new Response(JSON.stringify(result), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, message: e instanceof Error ? e.message : "Erro" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
