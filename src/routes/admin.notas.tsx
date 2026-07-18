import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, StickyNote } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notas")({
  component: NotasPage,
});

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

const KEY = "routeiq.admin.notes";

function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function saveNotes(notes: Note[]) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(notes));
}

function NotasPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => { setNotes(loadNotes()); }, []);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !body.trim()) return;
    const next = [{
      id: crypto.randomUUID(),
      title: title.trim() || "Sem título",
      body: body.trim(),
      createdAt: new Date().toISOString(),
    }, ...notes];
    setNotes(next); saveNotes(next);
    setTitle(""); setBody("");
    toast.success("Anotação salva");
  };

  const remove = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next); saveNotes(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <StickyNote className="h-6 w-6" /> Caderno de anotações
        </h1>
        <p className="text-xs text-muted-foreground">Ideias, rotas futuras, lembretes.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={add} className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título (ex: Rota Zona Sul)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Detalhes, endereços, observações..."
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full">Nenhuma anotação ainda.</p>
        )}
        {notes.map((n) => (
          <Card key={n.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{n.title}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {n.body && <p className="text-sm whitespace-pre-wrap">{n.body}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
