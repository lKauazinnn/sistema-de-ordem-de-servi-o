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

## Sessao e rascunhos (sem logout por tempo)

O app foi ajustado para nunca derrubar o usuario nem apagar o que ele preencheu:

- A sessao fica no `localStorage` e o token e renovado automaticamente, inclusive ao
  voltar para a aba, ao reconectar a internet e antes de cada chamada as rotas `/api`.
- Renovacao de token nao remonta mais as telas: o estado de "carregando" so existe no
  primeiro carregamento, entao a pagina em uso nunca e descartada.
- Formularios, buscas, filtros, abas e modais abertos sao gravados no navegador
  (`usePersistedState`) e restaurados sem prazo de validade - o usuario pode voltar
  horas ou dias depois que continua de onde parou. Senhas nunca sao gravadas.

Importante: o tempo maximo da sessao tambem depende do painel do Supabase
(Authentication > Sessions). Para que ninguem seja deslogado por tempo, deixe
"Time-box user sessions" e "Inactivity timeout" vazios/desligados.

## Testes

```bash
npm test
```

## Observacoes fiscais

A emissao de NF-e/NFS-e foi estruturada via Edge Function (`supabase/functions/nfe-sefaz`), com placeholders para SOAP/SEFAZ, certificado A1 e fluxos de autorizacao/cancelamento/inutilizacao.
