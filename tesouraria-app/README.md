# Tesouraria Estudantil — Frontend

Aplicação web do projeto **Gestão de Tesouraria para Organizações Estudantis** (DEI, UBI).

**Produção:** [https://tesouraria-app-gamma.vercel.app](https://tesouraria-app-gamma.vercel.app)



## Stack tecnológica

- React + Vite
- Tailwind CSS v4
- React Router
- Supabase (Auth + PostgreSQL + Storage)
- Recharts

## Requisitos

- Node.js (versão LTS recomendada) e npm
- Navegador web moderno
- Projeto Supabase configurado — ver `[../supabase/SETUP.md](../supabase/SETUP.md)`

## Instalação e execução local

1. Configurar o backend Supabase — `[../supabase/SETUP.md](../supabase/SETUP.md)`
2. Instalar dependências:

```bash
cd tesouraria-app
npm install
```

1. Criar `.env` a partir de `.env.example` e preencher:

```bash
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env
```

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-ou-anon-key>
```

Os valores obtêm-se em **Project Settings → Data API** (URL) e **Project Settings → API Keys** (Publishable key). Nunca utilizar a chave **Secret** no frontend.

1. Arrancar a aplicação:

```bash
npm run dev
```

1. Abrir no browser:
  - `http://localhost:5173/registo` — novo núcleo
  - `http://localhost:5173/login` — autenticação

O build de produção obtém-se com `npm run build`; a pasta `dist/` contém os ficheiros estáticos.

## Estrutura do projeto


| Pasta / ficheiro                 | Descrição                                                             |
| -------------------------------- | --------------------------------------------------------------------- |
| `src/pages/`                     | Páginas principais (dashboard, folhas, fecho, eventos, planos, ajuda) |
| `src/components/`                | Componentes reutilizáveis e layout                                    |
| `src/hooks/`                     | Lógica de dados (movimentos, fecho, planos)                           |
| `src/lib/`                       | Cálculos e regras de negócio                                          |
| `src/supabase/supabaseClient.js` | Cliente Supabase                                                      |
| `vercel.json`                    | Reescritas de rotas para SPA em produção                              |


## Modelo de dados e armazenamento

Tabelas principais (detalhe em `[../supabase/schema.sql](../supabase/schema.sql)`):

- `**nucleos**` — perfil do núcleo (`id = auth.uid()`)
- `**movimentos**` — registos por núcleo, mês e tipo de conta
- `**fechos_mensais**` — metadados de fecho mensal
- `**eventos**`, `**planos**` — orçamentos e documentos de mandato (PAO/RAC)

Todas as tabelas têm **RLS** ativo. O bucket privado `nucleos` no Storage limita cada utilizador ao prefixo `<uid>/...`; os ficheiros são acedidos via URLs assinadas.

## Autenticação

No Supabase, ativar o provider **Email**. Em desenvolvimento pode desativar-se a confirmação de e-mail; em produção reativar confirmação e configurar **Site URL** e **Redirect URLs** no painel Supabase.

Ao registar um núcleo, a aplicação cria o utilizador em Authentication e a linha correspondente em `public.nucleos`.