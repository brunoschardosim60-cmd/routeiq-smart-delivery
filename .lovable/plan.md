
Plano priorizado seguindo suas respostas. Faço as 4 fases em sequência, mas paro pra você conferir depois de cada uma se quiser.

## Fase 1 — Isolamento de empresa + mapa (o que mais te incomoda)

**Bugs encontrados pela investigação:**
- A Sidebar mostra "DBM"/"BS Soluções" de um mock em `sessionStorage` (`src/lib/current-company.ts`), enquanto o Header mostra o nome real do banco. Por isso o nome fica diferente.
- No `login.tsx` linhas 25-29, um `if (slug.includes("bs"))` força toda empresa que não tem "bs" no slug pra virar "DBM" na tela — bug real.
- `src/lib/routes-db.ts:26` e `src/lib/company-members.ts:28` **hardcodam `company: "BS"`** em toda linha vinda do banco, então rotas/motoristas de qualquer empresa aparecem como "BS" na UI. É isso que dá a sensação de "dados de outras empresas".
- `admin.motoristas.tsx` mistura 3 fontes: motoristas reais do Supabase + extras do localStorage + motoristas mock estáticos. Junto com o hardcode acima, aparece gente que não é da empresa.
- `admin.motoristas.$driverId.tsx` é 100% mock — clicar num motorista real mostra dados de outra pessoa.
- Google Maps: chave direta com restrição de referrer bloqueia silenciosamente (Promise nunca resolve, sem erro visível). Vou trocar pelo connector Lovable de Google Maps (chave gerenciada, funciona no preview) e adicionar mensagem clara quando falhar.

**Correções:**
1. Sidebar lê `useAuth().company.name` em vez do mock. Remover `CompanySwitcher` do Header (é mock DBM/BS que não faz sentido no app real).
2. Remover `sessionStorage` mock (`current-company.ts`) e o hack de slug no `login.tsx`.
3. `rowToRouteRow` e `toDriver` deixam de forçar `"BS"` — derivam de `company_id` real da linha (ou omitem o campo, já que a query já é filtrada por empresa no servidor).
4. `admin.motoristas.tsx` passa a listar só motoristas reais (`useCompanyDrivers` puro), sem mesclar mock/extras.
5. `admin.motoristas.$driverId.tsx` busca perfil real do Supabase por `driver_id`, com estados de loading/404.
6. Google Maps via connector Lovable (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`). Se `ready` não virar `true` em ~8s, mostra card "Não foi possível carregar o mapa — verifique a chave/restrições" com botão de tentar novamente.

## Fase 2 — Motorista mais simples (cadastro + home)

**Cadastro em 1 tela só, criando conta real:**
- `AddDriverModal` hoje só grava em `localStorage` (via `extra-drivers`), não cria login real. Vou trocar por uma server function que:
  - Cria o `auth.users` (admin API), já com senha temporária.
  - Insere `profiles` com `company_id` do admin logado.
  - Insere `user_roles` com role `motorista`.
  - Insere `driver_profiles` (veículo, placa, diária, 2ª saída).
- Um modal, um botão "Cadastrar", devolve a senha temporária pro admin copiar/mostrar ao motorista.
- Remove a lista `mock-data` e `extra-drivers` da tela (só motoristas reais).

**Home do motorista = rota do dia + mapa:**
- Cria `src/routes/motorista.index.tsx` que redireciona `/motorista` → `/motorista/hoje` (nova tela).
- `/motorista/hoje` mostra: a rota atribuída para hoje (pega da `assigned_routes` filtrando `date = today`), mapa grande com as paradas geocodificadas, botão grande "Começar rota" (leva pra `/navegar/$routeId` que já existe). Se não há rota hoje: card "Sem rota hoje — ver próximas" com link.
- Ajusta login pra mandar motorista pra `/motorista/hoje` em vez de `/motorista/dashboard`.
- Reorganiza Sidebar do motorista: "Hoje" em cima; Dashboard, Rotas, Histórico, Financeiro, Combustível ficam abaixo (sem remover, como você pediu).

## Fase 3 — Caderno de anotações do admin (compartilhado por empresa)

**Banco (nova migration):**
```sql
CREATE TABLE public.company_notes (
  id uuid PK,
  company_id uuid NOT NULL REFERENCES companies,
  author_id uuid REFERENCES auth.users,
  title text,
  body text,
  color text DEFAULT 'yellow',   -- amarelo/azul/verde/rosa (pré-definidos)
  pinned boolean DEFAULT false,
  created_at, updated_at
);
-- GRANTs pra authenticated + service_role
-- RLS: SELECT/INSERT/UPDATE/DELETE se is_company_admin(company_id)
-- trigger updated_at
```

**UI:** Nova rota `/admin/caderno` com:
- Grid de post-its (cor selecionável), pin/unpin, editar inline, deletar.
- Ordena pinned no topo + por `updated_at`.
- Item na Sidebar do admin: "Caderno".
- Persistência via server functions com `requireSupabaseAuth`.

## Fase 4 — Enxugar UI + delays + mapa arrastável

**Delays (as respostas indicam frustração real):**
- `src/router.tsx` — mudar `defaultPreloadStaleTime: 0` pra `defaultPreloadStaleTime: 30_000` (respeita cache no preload em hover).
- Adicionar `preload: "intent"` nos `Link`s da Sidebar (hover pré-carrega a rota).
- `useAuth` — permitir render otimista da UI logada enquanto contexto (roles/company) ainda carrega, em vez de bloquear tudo com spinner por 2 requests em cascata.

**Mapa que "flui entre telas" (sua resposta):**
- Componente `<FloatingMapPanel />` global (persistido no `AppShell`), renderiza uma janela redimensionável + arrastável (headless-ui / dnd simples) que mantém o mesmo `RouteMap` montado ao trocar de tela. Estado (posição, tamanho, minimizado) em `localStorage`.
- Botão flutuante no canto: minimizar/maximizar/fechar. Modo "tela cheia" abre `/navegar/$routeId`.
- Nas telas de detalhe da rota, o mapa embutido é substituído por um botão "Abrir mapa" que abre o painel flutuante focado naquela rota — evita duplicar instâncias do Google Maps (custa quota + é lento).

**Sidebar:** Mantém todos os itens (você pediu pra não remover), mas agrupa visualmente em seções ("Operação", "Gestão", "Conta") com separadores — reduz poluição sem cortar nada.

---

## Ordem de entrega

Faço Fase 1 primeiro e paro pra você validar (nome empresa certo, sem leak, mapa carregando). Depois Fase 2, 3, 4 na sequência. Total estimado: ~4 rodadas grandes de edição.

## Detalhes técnicos (referência interna)

- Migration única no início da Fase 3 pra `company_notes`.
- Nenhuma mudança em RLS de `assigned_routes` (já está correta, era bug de UI).
- Server functions novas: `admin-create-driver.functions.ts`, `company-notes.functions.ts`.
- Deletar: `src/lib/current-company.ts`, `src/lib/extra-drivers.ts`, `src/components/CompanySwitcher.tsx`, mocks de driver em `mock-data.ts` (mantém tipos).
- Google Maps: conectar via `standard_connectors--connect` (google_maps) e trocar `use-google-maps.ts` pra ler `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`. Sua chave manual atual fica como fallback.
