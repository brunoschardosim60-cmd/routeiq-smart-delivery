import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Truck, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { setCurrentCompany } from "@/lib/current-company";
import { getMyContext } from "@/lib/auth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");

  const finalizeSession = async () => {
    const ctx = await getMyContext();
    const isOwnerOrAdmin = ctx.roles.includes("owner") || ctx.roles.includes("admin");
    if (ctx.company?.slug) {
      const slug = ctx.company.slug.toLowerCase();
      if (slug.includes("bs")) setCurrentCompany("BS");
      else setCurrentCompany("DBM");
    }
    navigate({ to: isOwnerOrAdmin ? "/admin/dashboard" : "/motorista/dashboard" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
      if (error) throw error;
      await finalizeSession();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (result.redirected) return;
      await finalizeSession();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro Google";
      toast.error(msg);
      setLoading(false);
    }
  };

  // Captura sessão após retorno do OAuth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        finalizeSession().catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 routeiq-bg-grid opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Truck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">RouteIQ</h1>
          <p className="text-sm text-muted-foreground">Gestão inteligente de entregas</p>
        </div>

        <div className="rounded-xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur">
          <h2 className="mb-5 text-lg font-semibold">Entrar</h2>

          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="E-mail">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Senha">
              <div className="relative">
                <input
                  required
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  className={`${inputCls} pr-10`}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button onClick={onGoogle} disabled={loading} className="w-full rounded-md border border-border bg-accent/40 py-2 text-xs font-medium hover:bg-accent disabled:opacity-60">
            Continuar com Google
          </button>

          <div className="mt-4 flex items-center justify-between">
            <Link to="/cadastro" className="text-xs font-medium text-primary hover:underline">
              Não tem conta? Cadastrar
            </Link>
            <Link to="/forgot-password" className="text-[11px] text-muted-foreground hover:text-foreground">Esqueci minha senha</Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">© RouteIQ</p>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
