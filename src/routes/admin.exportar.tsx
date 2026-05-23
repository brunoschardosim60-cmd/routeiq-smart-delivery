import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Database, Users, HardDrive, Download, Loader2, Info, FileCode, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  exportAuthUsers,
  exportSchemaSql,
  exportStorage,
  exportTable,
  listExportResources,
} from "@/lib/export-data.functions";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/exportar")({
  component: ExportarPage,
});

function csvEscape(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") v = JSON.stringify(v);
  const s = String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) {
    toast.warning("Nenhum dado para exportar");
    return;
  }
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r ?? {}).forEach((k) => acc.add(k));
      return acc;
    }, new Set()),
  );
  const lines = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => csvEscape(r?.[h])).join(";")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function ExportarPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [sql, setSql] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { data: resources } = useQuery({
    queryKey: ["export", "resources"],
    queryFn: () => listExportResources(),
  });

  const loadSql = async () => {
    setLoading("sql");
    try {
      const res = await exportSchemaSql();
      setSql(res.sql);
      toast.success("SQL gerado");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar SQL");
    } finally {
      setLoading(null);
    }
  };

  const copySql = async () => {
    if (!sql) return;
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    toast.success("SQL copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSql = () => {
    if (!sql) return;
    const blob = new Blob([sql], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "schema.sql";
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  };

  const handleTable = async (table: string) => {
    setLoading(`table:${table}`);
    try {
      const res = await exportTable({ data: { table: table as any } });
      downloadCsv(`${table}.csv`, res.rows);
      toast.success(`${table}: ${res.rows.length} linhas`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao exportar");
    } finally {
      setLoading(null);
    }
  };

  const handleAuth = async () => {
    setLoading("auth");
    try {
      const res = await exportAuthUsers();
      downloadCsv("auth_users.csv", res.rows);
      toast.success(`${res.rows.length} usuários`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao exportar");
    } finally {
      setLoading(null);
    }
  };

  const handleStorage = async (kind: "buckets" | "objects") => {
    setLoading(`storage:${kind}`);
    try {
      const res = await exportStorage();
      if (kind === "buckets") {
        downloadCsv("storage_buckets.csv", res.buckets);
        toast.success(`${res.buckets.length} bucket(s)`);
      } else {
        downloadCsv("storage_objects.csv", res.objects);
        toast.success(`${res.objects.length} arquivo(s)`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao exportar");
    } finally {
      setLoading(null);
    }
  };

  const exportAll = async () => {
    if (!resources?.tables) return;
    setLoading("all");
    try {
      for (const t of resources.tables) {
        const res = await exportTable({ data: { table: t as any } });
        if (res.rows.length > 0) downloadCsv(`${t}.csv`, res.rows);
      }
      const u = await exportAuthUsers();
      if (u.rows.length > 0) downloadCsv("auth_users.csv", u.rows);
      const s = await exportStorage();
      if (s.buckets.length > 0) downloadCsv("storage_buckets.csv", s.buckets);
      if (s.objects.length > 0) downloadCsv("storage_objects.csv", s.objects);
      toast.success("Exportação completa");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao exportar");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exportar Dados</h1>
          <p className="text-sm text-muted-foreground">
            Baixe os dados do Lovable Cloud em arquivos CSV.
          </p>
        </div>
        <button
          onClick={exportAll}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar tudo
        </button>
      </div>

      {/* SQL Schema */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <FileCode className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">SQL das tabelas (schema)</h3>
              <p className="text-xs text-muted-foreground">
                Gera CREATE TABLE + RLS + políticas — pronto para colar em outro Lovable Cloud / Supabase.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={loadSql}
              disabled={loading !== null}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading === "sql" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />}
              {sql ? "Regenerar" : "Gerar SQL"}
            </button>
            {sql && (
              <>
                <button
                  onClick={copySql}
                  className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  Copiar
                </button>
                <button
                  onClick={downloadSql}
                  className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
                >
                  <Download className="h-4 w-4" />
                  Baixar .sql
                </button>
              </>
            )}
          </div>
          {sql && (
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs font-mono whitespace-pre">
              {sql}
            </pre>
          )}
        </CardContent>
      </Card>

      {/* Auth Users */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Usuários (Auth)</h3>
              <p className="text-xs text-muted-foreground">Lista de usuários cadastrados</p>
            </div>
          </div>
          <button
            onClick={handleAuth}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            {loading === "auth" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Baixar CSV
          </button>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Storage</h3>
              <p className="text-xs text-muted-foreground">
                Buckets e metadados dos arquivos (os binários precisam ser baixados pelo painel)
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleStorage("buckets")}
              disabled={loading !== null}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
            >
              {loading === "storage:buckets" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Buckets
            </button>
            <button
              onClick={() => handleStorage("objects")}
              disabled={loading !== null}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
            >
              {loading === "storage:objects" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Arquivos
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Database tables */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Banco de dados ({resources?.tables.length ?? 0} tabelas)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resources?.tables.map((t) => (
            <Card key={t}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <code className="text-sm font-mono truncate">{t}</code>
                <button
                  onClick={() => handleTable(t)}
                  disabled={loading !== null}
                  title={`Exportar ${t}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50 shrink-0"
                >
                  {loading === `table:${t}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  CSV
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Secrets, Edge Functions e Logs</strong> não podem ser exportados via app — acesse o painel do Lovable Cloud.</p>
            <p>Os <strong>binários do Storage</strong> precisam ser baixados manualmente pelo painel. Aqui você obtém apenas o índice/metadados.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
