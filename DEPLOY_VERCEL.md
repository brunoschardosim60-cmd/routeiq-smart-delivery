# Deploy do RouteIQ na Vercel

> ⚠️ **Importante**: este guia é para rodar **depois de exportar o projeto para o GitHub**.
> Não aplique essas mudanças dentro do editor da Lovable — elas quebram o preview e o botão Publish.
> O preview/Publish da Lovable continua funcionando no Cloudflare Workers normalmente.

## Por que essas mudanças?

O template TanStack Start da Lovable é configurado para Cloudflare Workers via `@lovable.dev/vite-tanstack-config`
(que injeta o `@cloudflare/vite-plugin` automaticamente). Pra rodar na Vercel você precisa:

1. Trocar o target do TanStack Start de `cloudflare` para `vercel`
2. Remover o wrapper `src/server.ts` (entrypoint Worker)
3. Remover `wrangler.jsonc` (config Cloudflare)
4. Substituir o `vite.config.ts` para não usar o wrapper Lovable
5. Configurar as variáveis de ambiente no painel da Vercel

---

## Passo 1 — Exportar para o GitHub

Clique em **GitHub → Connect to GitHub** no topo direito do editor e siga o fluxo.
Faça um `git clone` do repo localmente.

## Passo 2 — Aplicar as mudanças de código

### 2.1 — Substituir `vite.config.ts`

```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({ target: "vercel" }),
    viteReact(),
  ],
  resolve: {
    alias: { "@": "/src" },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
});
```

### 2.2 — Deletar arquivos específicos do Cloudflare

```bash
rm src/server.ts
rm wrangler.jsonc
```

### 2.3 — Remover dependência Cloudflare

```bash
bun remove @cloudflare/vite-plugin @lovable.dev/vite-tanstack-config
```

### 2.4 — Manter `vercel.json` (já criado neste repo)

O arquivo `vercel.json` já está no projeto. Não precisa mexer.

## Passo 3 — Configurar variáveis de ambiente na Vercel

No painel **Vercel → Settings → Environment Variables**, adicione (Production + Preview):

| Nome | Valor |
|------|-------|
| `SUPABASE_URL` | `https://eklqxwmoypxdfyplzevc.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | (mesmo valor do `.env`) |
| `SUPABASE_SERVICE_ROLE_KEY` | (pegar no painel Supabase → API) |
| `COMPROVEI_ENCRYPTION_KEY` | (mesmo valor usado hoje) |
| `LOVABLE_API_KEY` | (mesmo valor usado hoje) |
| `VITE_SUPABASE_URL` | igual ao `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | igual ao `SUPABASE_PUBLISHABLE_KEY` |
| `VITE_SUPABASE_PROJECT_ID` | `eklqxwmoypxdfyplzevc` |

## Passo 4 — Deploy

```bash
# Opção A: CLI
npx vercel
npx vercel --prod

# Opção B: Vercel Dashboard
# Import Project → selecione o repo → Deploy
```

O Vercel detecta automaticamente o build de TanStack Start.

## Passo 5 — Configurar pg_cron (Comprovei sync)

O endpoint `/api/public/hooks/comprovei-sync` agora vive em
`https://SEU-PROJETO.vercel.app/api/public/hooks/comprovei-sync`.

Atualize a configuração do `pg_cron` no Supabase para chamar essa URL nova.

---

## Manutenção dual (Lovable + Vercel)

- **Continuar iterando na Lovable**: faça mudanças no editor, dê commit pelo botão GitHub. As mudanças sobem pro repo.
- **Deploy automático na Vercel**: cada push no `main` dispara um deploy.
- **Cuidado**: se a Lovable mudar `vite.config.ts` ou recriar `src/server.ts`, o build na Vercel quebra. Mantenha esses arquivos travados (ou reverta as mudanças após cada sync).

## Alternativa recomendada

Se você só quer ter o app online rápido, o botão **Publish** da Lovable sobe em segundos em `*.lovable.app` (com custom domain opcional) e elimina toda essa complexidade.
