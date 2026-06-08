import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Truck, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listPublicCompanies } from "@/lib/companies.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({
  component: SignupPage,
});

type Mode = "join" | "owner";

function SignupPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("join");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string; slug: string }[]>([]);

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    listPublicCompanies().then((r) => setCompanies(r.companies)).catch(() => {});
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "join") {
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
      }
      // Não entra direto — desloga e manda para a tela de login
      await supabase.auth.signOut().catch(() => {});
      toast.success("Conta criada! Agora faça login.");
      navigate({ to: "/login" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 routeiq-bg-grid opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Truck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Criar conta</h1>
          <p className="text-sm text-muted-foreground">Escolha como você vai usar o RouteIQ</p>
        </div>

        <div className="rounded-xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-xs">
            {([
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
            <Field label="Nome completo">
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
            </Field>

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
              <div className="relative">
                <input
                  required
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  className={`${inputCls} pr-10`}
                  placeholder="Mínimo 6 caracteres"
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
              {mode === "join" ? "Criar conta" : "Criar empresa"}
            </button>
          </form>

          <div className="mt-4 flex justify-center">
            <Link to="/login" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Já tenho conta, entrar
            </Link>
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
