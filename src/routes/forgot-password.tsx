import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("E-mail enviado", { description: "Confira sua caixa de entrada." });
    } catch (e) {
      toast.error("Falha ao enviar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Recuperar senha</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Digite seu e-mail e enviaremos um link de redefinição.
        </p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md border border-success/30 bg-success/10 p-3 text-xs text-success">
              Enviamos um link para <span className="font-medium">{email}</span>. Pode levar alguns minutos.
            </p>
            <Link to="/login" className="block text-center text-xs text-primary hover:underline">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="voce@empresa.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </button>
            <Link to="/login" className="block text-center text-xs text-muted-foreground hover:text-foreground">
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
