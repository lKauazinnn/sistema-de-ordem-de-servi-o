# OrdemFlow Tech (Assistencia Tecnica)

Projeto web OrdemFlow Tech para gestao de ordens de servico (OS), estoque, clientes e emissao de documentos, com frontend React + TypeScript e backend serverless em API Routes para Vercel, usando Supabase como backend principal.

## Stack

- Frontend: React + TypeScript + TailwindCSS + React Query
- Backend API Routes: Node.js serverless na pasta `api/`
- Banco e Auth: Supabase (PostgreSQL + Auth + RLS + Realtime + Storage)
- Validacao: Zod
- Testes: Vitest + React Testing Library

## Estrutura

- `web/`: aplicacao frontend
- `api/`: funcoes serverless para operacoes sensiveis/integracoes
- `supabase/migrations/`: schema SQL, RLS, triggers, views e RPCs
- `supabase/functions/`: Edge Functions (NF-e/SEFAZ)
- `supabase/seed/`: dados iniciais

## Configuracao

1. Instale dependencias do frontend:

```bash
npm --prefix web install
```

2. Crie `.env.local` na raiz com base em `.env.example`.

3. Rode o frontend em desenvolvimento:

```bash
npm run dev
```

Opcional (Windows): execute `iniciar-local.bat` para instalar dependencias, rodar testes e iniciar o app automaticamente.

## Supabase (migrations e seed)

1. Crie projeto no Supabase.
2. Execute as migrations em `supabase/migrations`.
3. Execute o seed em `supabase/seed/seed.sql`.
4. Configure Storage buckets: `os-pdfs`, `nfe-xml`, `nfe-pdf`.

## Deploy na Vercel

1. Conecte o repositorio na Vercel.
2. Build Command: `npm --prefix web run build`
3. Output Directory: `web/dist`
4. Configure variaveis do `.env.example` na Vercel.
5. Publique.

Guia recomendado para iniciar sem custo nesta fase: `docs/producao-zero-custo.md`.

## RBAC por cargo

Cargos suportados:

- `admin`: acesso total
- `gerente`: OS, estoque, relatorios e aprovacoes
- `atendente`: abertura/edicao de OS e clientes
- `tecnico`: somente OS atribuidas e atualizacao de status

A seguranca e aplicada em duas camadas:

- Frontend: guards de rotas por cargo
- Banco: politicas RLS por role e ownership

## Testes

```bash
npm test
```

## Observacoes fiscais

A emissao de NF-e/NFS-e foi estruturada via Edge Function (`supabase/functions/nfe-sefaz`), com placeholders para SOAP/SEFAZ, certificado A1 e fluxos de autorizacao/cancelamento/inutilizacao.
