import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Truck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { setCurrentCompany } from "@/lib/current-company";
import { getMyContext } from "@/lib/auth.functions";
import { listPublicCompanies } from "@/lib/companies.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Mode = "signin" | "join" | "owner";

function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string; slug: string }[]>([]);

  // form state
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    listPublicCompanies().then((r) => setCompanies(r.companies)).catch(() => {});
  }, []);

  const finalizeSession = async () => {
    const ctx = await getMyContext();
    qc.setQueryData(["auth", "ctx"], ctx);
    const isOwnerOrAdmin = ctx.roles.includes("owner") || ctx.roles.includes("admin");
    if (ctx.company?.slug) {
      const slug = ctx.company.slug.toLowerCase();
      if (slug.includes("dbm")) setCurrentCompany("DBM");
      else if (slug.includes("bs")) setCurrentCompany("BS");
      else setCurrentCompany("DBM");
    }
    navigate({ to: isOwnerOrAdmin ? "/admin/dashboard" : "/motorista/dashboard" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) throw error;
        await finalizeSession();
      } else if (mode === "join") {
        if (!companyId) throw new Error("Escolha a empresa.");
        const { error } = await supabase.auth.signUp({
          email,
          password: pwd,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role: "motorista", company_id: companyId },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Entrando…");
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (e2) throw e2;
        await finalizeSession();
      } else {
        if (!companyName.trim()) throw new Error("Informe o nome da empresa.");
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const { error } = await supabase.auth.signUp({
          email,
          password: pwd,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role: "owner", company_name: companyName, company_slug: slug },
          },
        });
        if (error) throw error;
        toast.success(`Empresa "${companyName}" criada!`);
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (e2) throw e2;
        await finalizeSession();
      }
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
          <div className="mb-5 grid grid-cols-3 gap-1 rounded-md bg-muted p-1 text-xs">
            {([
              { k: "signin", l: "Entrar" },
              { k: "join", l: "Sou da equipe" },
              { k: "owner", l: "Sou dono" },
            ] as const).map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setMode(t.k)}
                className={`rounded py-1.5 transition ${mode === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t.l}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode !== "signin" && (
              <Field label="Nome completo">
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
              </Field>
            )}

            {mode === "join" && (
              <Field label="Empresa">
                {companies.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Nenhuma empresa cadastrada. Peça ao dono para criar uma.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {companies.map((c) => {
                      const active = companyId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCompanyId(c.id)}
                          className={`rounded-full border px-3 py-1 text-xs transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent text-muted-foreground hover:text-foreground"}`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Field>
            )}

            {mode === "owner" && (
              <Field label="Nome da empresa">
                <input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} placeholder="Ex: DBM Logística" />
              </Field>
            )}

            <Field label="E-mail">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Senha">
              <input required type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className={inputCls} placeholder="Mínimo 6 caracteres" minLength={6} />
            </Field>

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : mode === "join" ? "Criar conta" : "Criar empresa"}
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

          <div className="mt-3 flex justify-end">
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
