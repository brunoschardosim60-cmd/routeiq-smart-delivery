import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Realtime: assina mudanças em assigned_routes da empresa atual.
 * - Quando uma rota é UPDATE para status=concluido, mostra toast ao admin.
 * - Invalida queries para atualizar listas sem reload.
 */
export function useRoutesRealtime(opts: { notifyOnFinish: boolean }) {
  const qc = useQueryClient();
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("assigned_routes_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assigned_routes" },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["assigned-routes-db"] });

          if (!opts.notifyOnFinish) return;
          if (payload.eventType !== "UPDATE") return;
          const newRow = payload.new as { id?: string; status?: string; driver_name?: string; code?: string };
          const oldRow = payload.old as { status?: string };
          if (
            newRow?.status === "concluido" &&
            oldRow?.status !== "concluido" &&
            newRow.id !== lastIdRef.current
          ) {
            lastIdRef.current = newRow.id ?? null;
            toast.success("Rota finalizada", {
              description: `${newRow.driver_name ?? "Motorista"} finalizou ${newRow.code ?? "uma rota"}.`,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, opts.notifyOnFinish]);
}
