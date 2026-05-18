## Plano — sincronização real + relatórios CSV

### Parte 1 — Migrar rotas e abastecimentos para o banco

Hoje `assigned-routes` e `combustivel` salvam só em `localStorage`. Vou criar duas tabelas com RLS por empresa para que admin enxerga tudo da empresa e motorista enxerga só o dele, em qualquer dispositivo.

**Migração (tabelas + RLS):**

```text
assigned_routes
  - company_id, driver_id (uuid auth), driver_name
  - code, date_iso, departure, expected_return
  - origin, destination, total_deliveries, done
  - km, km_start, km_end, cost, revenue, status, notes

fuel_entries
  - company_id, driver_id (uuid auth), driver_name
  - date_iso, vehicle, plate, liters, price_per_l, total
  - odometer, station, notes
```

RLS:
- motorista: SELECT/INSERT/UPDATE/DELETE só onde `driver_id = auth.uid()`
- admin/owner da empresa: SELECT/UPDATE/DELETE em tudo da `company_id` (via `is_company_admin`)
- INSERT do admin: pode criar rota atribuindo a qualquer motorista da empresa

**Server functions** (`src/lib/routes-db.functions.ts`, `src/lib/fuel-db.functions.ts`):
- `listMyRoutes()` / `listCompanyRoutes()` / `createAssignedRoute()` / `updateRouteStatus()` / `deleteRoute()`
- `listMyFuel()` / `listCompanyFuel()` / `createFuelEntry()` / `deleteFuelEntry()`

**Telas afetadas** — trocar leitura/escrita de localStorage para as server fns:
- `motorista.rotas.tsx`, `motorista.rotas.nova.tsx`, `motorista.combustivel.tsx`
- `admin.rotas.tsx`, `admin.rotas.nova.tsx`, `admin.combustivel.tsx`, `admin.financeiro.tsx`, `admin.dashboard.tsx`

`localStorage` continua só como fallback para dados mock antigos (drivers seed).

### Parte 2 — Relatórios em CSV

Em `admin.relatorios.tsx`, habilitar "Exportar CSV" para os relatórios que dependem de dados reais agora disponíveis no banco:
- **Entregas/rotas por período** — `assigned_routes` filtrado por data + motorista
- **Custos operacionais** — soma de `fuel_entries.total` + `assigned_routes.cost` por período
- **Combustível** — `fuel_entries` por veículo/motorista
- **KM por veículo** — agregado de `fuel_entries.odometer` + `assigned_routes.km`
- **Lucro por rota** — `revenue - cost` por linha de `assigned_routes`

CSV gerado client-side via `Blob` + download direto (sem dependência nova). Filtros de período, motorista e veículo já existem no painel — só vou ligar ao botão.

### Ordem de execução

1. Migração SQL (tabelas + RLS) — pedir aprovação.
2. Server functions de rotas e combustível.
3. Refatorar telas para usar as fns (mantendo UX atual).
4. Implementar geração de CSV no `admin.relatorios.tsx`.

Confirma para eu rodar a migração?
