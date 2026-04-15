# Producao Sem Custo (Fase 1)

Objetivo: colocar o sistema no ar com custo zero inicial, mantendo operacao real de OS e documentos em modo fiscal manual.

## Estrategia

- Frontend/API: Vercel Hobby
- Banco/Auth/Storage: Supabase Free
- Fiscal: `NFE_PROVIDER=manual` (sem automacao SEFAZ)

## Variaveis obrigatorias

Configure na Vercel e no ambiente local:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OWNER_EMAIL`
- `VITE_USE_SERVER_NFE=true`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `NFE_PROVIDER=manual`
- `NFE_MANUAL_MODE=true`

## Passos de go-live

1. Aplicar migrations no Supabase, incluindo:
- `supabase/migrations/20260414_init.sql`
- `supabase/migrations/20260414_owner_admin.sql`
- `supabase/migrations/20260414_fix_os_permissions.sql`

2. Criar buckets no Storage:
- `os-pdfs`
- `nfe-xml`
- `nfe-pdf`

3. Publicar na Vercel com build do frontend.

4. Validar fluxo minimo em producao:
- login com owner admin
- criar OS
- gerar PDF
- registrar NF-e manual (status `emitida_manual`)

## Limites desta fase

- Nao ha transmissao fiscal automatica para SEFAZ/prefeitura.
- O modulo de NF nesta fase e de controle operacional interno.

## Fase 2 (quando houver verba)

- PlugNotas (mais rapido) ou ACBrLib (baixo custo licenca)
- assinatura digital + envio fiscal automatico
- armazenamento de XML/DANFE com protocolo de autorizacao
