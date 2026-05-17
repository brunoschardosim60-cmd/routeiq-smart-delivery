import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/auth.functions";

export type Role = "admin" | "motorista";

export function useAuth() {
  const qc = useQueryClient();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setHasSession(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setHasSession(!!session);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        qc.invalidateQueries({ queryKey: ["auth", "ctx"] });
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [qc]);

  const ctxQ = useQuery({
    queryKey: ["auth", "ctx"],
    queryFn: () => getMyContext(),
    enabled: hasSession === true,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (ctxQ.isError) {
      supabase.auth.signOut().catch(() => {});
    }
  }, [ctxQ.isError]);

  const ctx = ctxQ.data;
  const isOwnerOrAdmin = ctx?.roles.some((r) => r === "owner" || r === "admin") ?? false;
  const role: Role | null = ctx ? (isOwnerOrAdmin ? "admin" : "motorista") : null;

  return {
    loading: hasSession === null || (hasSession === true && (ctxQ.isLoading || !ctx)),
    isAuthenticated: hasSession === true,
    user: ctx?.profile ?? null,
    company: ctx?.company ?? null,
    roles: ctx?.roles ?? [],
    role,
  };
}

export async function logout() {
  try { await supabase.auth.signOut(); } catch { /* noop */ }
}
