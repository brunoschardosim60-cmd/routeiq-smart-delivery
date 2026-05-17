# Plano: finalizar pendências

## 1. Relatório por Empresa Cliente (NOVO)
- Nova página `/admin/relatorios/clientes` (ou aba dentro de `admin.relatorios.tsx`).
- Agrupa rotas concluídas por `client_company_id` no período selecionado.
- Mostra: nº de rotas, faturamento (`revenue`), pagamento motoristas (`driver_pay`), combustível (vindo de `fuel_entries` no período proporcional), lucro líquido.
- Filtros: mês/ano, motorista opcional.
- Rotas avulsas agrupam em "Avulsas".

## 2. Combustível por Rota
- Adicionar coluna opcional `assigned_route_id` em `fuel_entries` (nullable).
- No motorista: ao registrar combustível, selecionar (opcional) rota em andamento do dia.
- No detalhe da rota admin: listar abastecimentos vinculados.
- Dashboard motorista: passa a usar `revenue - driver_pay - combustivelVinculado` quando vinculado.
- Compatível: combustível sem rota continua agregado por período.

## 3. Editar/Excluir Rota Finalizada (admin)
- Na lista `admin.rotas.tsx` e detalhe `admin.rotas.$routeId.tsx`: botões "Editar valores" e "Excluir".
- Modal de edição permite alterar `revenue`, `driver_pay`, `cost`, `km_end`, `notes`.
- Excluir pede confirmação dupla.
- RLS já permite admin (`is_company_admin`).

## 4. Recálculo Retroativo de Tarifas
- Em `admin.clientes.tsx`, ao editar tarifas: botão "Recalcular rotas existentes deste cliente".
- ServerFn percorre `assigned_routes` concluídas com aquele `client_company_id`, recalcula `revenue` e `driver_pay` aplicando regra 1ª/2ª do dia.
- Mostra resumo (X rotas atualizadas) antes de confirmar.

## 5. Validar Timers "Em rota" (motorista)
- Em `motorista.rotas.tsx`, na seção da rota em andamento:
  - Tempo desde início (atualiza a cada 1s).
  - Tempo previsto até destino (se houver `expected_return`).
  - Indicador "parado" se sem movimento (baseado em última atualização — simplificado: tempo desde último `updated_at`).
- Hook `useEffect` com `setInterval`.

## 6. Histórico do motorista
- Confirmar `motorista.historico.tsx` usando `useDbAssignedRoutes()` filtrado por `driverId` + status `concluido`.
- Calendário marcando dias com rota concluída.

## 7. Detalhe da rota (admin)
- Confirmar `admin.rotas.$routeId.tsx` sem crash, com loading e exibição de todos os campos novos (`trip_type`, `client_company_id`, `driver_pay`).

## Fora de escopo
- Permissão de motorista editar rota avulsa antes de finalizar.
- Notificações push de finalização.
- Relatórios em PDF/Excel.

## Ordem de execução
1. Migration (colunas + índices) — itens 2.
2. ServerFns novas (recálculo, update/delete rota) — itens 3, 4.
3. UI Admin (relatórios cliente, edição rota, recálculo) — itens 1, 3, 4.
4. UI Motorista (combustível com rota, timers) — itens 2, 5.
5. Verificação visual itens 6 e 7 — só ajustes se necessário.

Estimativa: ~12-15 arquivos tocados, 1 migration.
