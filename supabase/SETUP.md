# Setup do Supabase

Configuração do backend da **Tesouraria Estudantil** (`tesouraria-app`).

> Este guia acompanha o código entregue e está reproduzido no Anexo do relatório. Para arrancar o frontend, ver `[../tesouraria-app/README.md](../tesouraria-app/README.md)`.

## 1. Criar conta e projeto

1. Criar conta em [supabase.com](https://supabase.com)
2. **New Project** — nome, database password, região EU (Frankfurt ou London), plano Free
3. Aguardar a conclusão da criação do projeto

## 2. Obter chaves de API

1. **Project Settings → API Keys** — copiar **Publishable key** → `VITE_SUPABASE_ANON_KEY`
2. **Project Settings → Data API** — copiar **Project URL** → `VITE_SUPABASE_URL`

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-ou-anon-key>
```

> Usar só a chave Publishable/anon no frontend — nunca a **Secret**. O acesso aos dados é controlado por RLS.

## 3. Criar esquema da base de dados

No **SQL Editor**, colar e executar o conteúdo de `[schema.sql](./schema.sql)`.

O script cria tabelas, índices, políticas RLS e políticas do Storage.

## 4. Authentication e Storage

1. **Authentication → Providers** — confirmar **Email** ativo
2. **Storage → New bucket** — nome `nucleos`, **privado** (Public bucket: OFF)

As policies do Storage são criadas pelo `schema.sql`.

Em desenvolvimento pode desativar-se **Confirm email** (login imediato). Em produção, reativar confirmação e configurar **Site URL** e **Redirect URLs** em Authentication.

## 5. Validar

Após `npm run dev` na pasta `tesouraria-app/`:

1. Registo de núcleo em `/registo`
2. Utilizador em **Authentication → Users**
3. Linha em **Table Editor → nucleos**
4. Movimento com anexo em `movimentos` e ficheiro em Storage
5. Checklist de fecho num mês de teste

## 6. Lembrete por e-mail no dia 5 (opcional)

A Edge Function `fecho-lembrete` envia e-mail no dia 5 se o mês anterior não tiver fecho definitivo. Requer Supabase CLI, conta Resend e secrets (`RESEND_API_KEY`, `APP_URL`, `FROM_EMAIL`).

```bash
npx supabase functions deploy fecho-lembrete
```

Agendar invocação diária executando `cron-fecho-lembrete.sql` no SQL Editor.

## 7. Publicação em produção

A versão validada está em [https://tesouraria-app-gamma.vercel.app](https://tesouraria-app-gamma.vercel.app).

Publicar na Vercel: importar repositório com raiz `tesouraria-app/`, definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, e atualizar **Site URL** / **Redirect URLs** no Supabase com o domínio final.