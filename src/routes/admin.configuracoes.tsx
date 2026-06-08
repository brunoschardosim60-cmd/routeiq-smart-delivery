import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/configuracoes")({
  component: ConfigPage,
});

function GeralTab() {
  const { company } = useAuth();
  return (
    <Card><CardContent className="p-6 space-y-4">
      <div>
        <label className="text-xs text-muted-foreground">Nome da empresa</label>
        <input readOnly value={company?.name ?? ""} className="mt-1 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm" />
      </div>
      <p className="text-xs text-muted-foreground">As demais informações da empresa serão configuradas em breve.</p>
    </CardContent></Card>
  );
}

function ConfigPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="veiculos">Veículos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4">
          <GeralTab />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Gerenciamento de usuários do sistema.</CardContent></Card>
        </TabsContent>
        <TabsContent value="veiculos" className="mt-4">
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Cadastro de veículos da frota.</CardContent></Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <Card><CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs text-muted-foreground">Custo por KM</label><input defaultValue="0,82" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground">Comissão padrão (%)</label><input defaultValue="18" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground">Preço médio combustível (R$/L)</label><input defaultValue="6,40" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-muted-foreground">Média KM/L padrão</label><input defaultValue="11,5" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
