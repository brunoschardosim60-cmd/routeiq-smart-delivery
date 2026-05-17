// Server functions per-motorista para Comprovei.
// Auth atual é mockada (sessionStorage). O cliente passa driverId; quando trocar
// para Supabase Auth real, basta substituir por requireSupabaseAuth + auth.uid().
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  runDriverComproveiSync,
  runAllDriversComproveiSync,
  testComproveiCredentials,
} from "./comprovei-driver.server";

const DriverIdSchema = z.object({ driverId: z.string().min(1).max(64) });

// READ: status da conta Comprovei do motorista (NUNCA retorna senha)
export const getMyComproveiStatus = createServerFn({ method: "GET" })
  .inputValidator((input) => DriverIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("driver_comprovei_credentials")
      .select("driver_id, comprovei_user, sync_active, last_sync_at, last_status, last_message, events_synced, routes_synced, stops_synced, updated_at")
      .eq("driver_id", data.driverId)
      .maybeSingle();
    if (!row) return { connected: false as const };
    return {
      connected: true as const,
      comproveiUser: row.comprovei_user,
      syncActive: row.sync_active,
      lastSyncAt: row.last_sync_at,
      lastStatus: row.last_status,
      lastMessage: row.last_message,
      eventsSynced: row.events_synced,
      routesSynced: row.routes_synced,
      stopsSynced: row.stops_synced,
      updatedAt: row.updated_at,
    };
  });

// TEST: testa credenciais sem salvar
const TestSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
});
export const testComproveiAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => TestSchema.parse(input))
  .handler(async ({ data }) => {
    return testComproveiCredentials(data.username, data.password);
  });

// CONNECT: salva credenciais (testa, criptografa e grava). Retorna status.
const ConnectSchema = z.object({
  driverId: z.string().min(1).max(64),
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
});
export const connectComproveiAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => ConnectSchema.parse(input))
  .handler(async ({ data }) => {
    // 1) Testa antes de salvar
    const test = await testComproveiCredentials(data.username, data.password);
    if (!test.ok) {
      return { ok: false, message: `Não foi possível conectar: ${test.message}` };
    }

    const key = process.env.COMPROVEI_ENCRYPTION_KEY;
    if (!key) throw new Error("COMPROVEI_ENCRYPTION_KEY não configurada");

    // 2) Salva via RPC (criptografa dentro do banco)
    const { error } = await supabaseAdmin.rpc("set_driver_comprovei_credentials", {
      p_driver_id: data.driverId,
      p_user: data.username,
      p_password: data.password,
      p_key: key,
    });
    if (error) throw new Error(error.message);

    // 3) Dispara primeira sync
    try { await runDriverComproveiSync(data.driverId, "manual"); } catch {/* não bloqueia */}

    return { ok: true, message: "Conta Comprovei conectada com sucesso." };
  });

// DISCONNECT: desativa sync (mantém histórico)
export const disconnectComproveiAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => DriverIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("driver_comprovei_credentials")
      .update({ sync_active: false })
      .eq("driver_id", data.driverId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// SYNC manual de um motorista
export const syncMyComprovei = createServerFn({ method: "POST" })
  .inputValidator((input) => DriverIdSchema.parse(input))
  .handler(async ({ data }) => {
    return runDriverComproveiSync(data.driverId, "manual");
  });

// SYNC de TODOS (admin/cron)
export const syncAllDriversComprovei = createServerFn({ method: "POST" })
  .handler(async () => {
    return runAllDriversComproveiSync("manual");
  });

// LISTA todas as conexões (admin)
export const listAllComproveiConnections = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("driver_comprovei_credentials")
      .select("driver_id, comprovei_user, sync_active, last_sync_at, last_status, last_message, events_synced, routes_synced")
      .order("updated_at", { ascending: false });
    return (data ?? []).map((r) => ({
      driverId: r.driver_id,
      comproveiUser: r.comprovei_user,
      syncActive: r.sync_active,
      lastSyncAt: r.last_sync_at,
      lastStatus: r.last_status,
      lastMessage: r.last_message,
      eventsSynced: r.events_synced,
      routesSynced: r.routes_synced,
    }));
  });
