# Deploy: Supabase (banco) + Render (API e site)

Ordem: **1. Supabase → 2. Brevo (e-mail) → 3. Render (API) → 4. Render (site) → 5. Ajuste final → 6. Teste**.
Anote cada valor que for pedido; vários passos dependem do anterior.

---

## 1. Banco no Supabase

1. Em supabase.com, **New project**. Senha do banco: **só letras e números** (sem `@ # ! / :`). Guarde a senha.
   Região: South America (São Paulo). Plano Free.
2. Clique em **Connect** → **Session pooler** → copie a URI. Troque `[YOUR-PASSWORD]` pela senha.
   Exemplo: `postgres://postgres.abcdefgh:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`
3. No seu computador, na pasta `backend`, crie/edite o `.env` **só para este passo** (não commite):

   ```
   DATABASE_URL=<a URI do passo 2>
   DB_SSL=true
   ```

4. Crie as tabelas:

   ```
   cd backend
   npm install
   npm run db:setup
   ```

   Para já carregar os dados fictícios de demonstração (processos, sentenças, acórdãos):

   ```
   npm run db:seed
   ```

   O script só roda em banco vazio, nunca apaga nada, e ativa o RLS no Supabase (bloqueia a API pública do projeto; o sistema continua funcionando porque conecta direto no Postgres).
5. Confira no Supabase → **Table Editor**: as tabelas devem aparecer.
6. Depois de testar, **volte o `backend/.env` para o banco local** (ou comente o `DATABASE_URL` da nuvem).

---

## 2. E-mail (Brevo) — necessário para o cadastro

O plano gratuito do Render **bloqueia SMTP** (portas 25/465/587), então o Gmail não funciona em produção. O sistema envia por HTTPS pela Brevo (grátis, 300 e-mails/dia).

1. Crie a conta em brevo.com.
2. **SMTP & API → API Keys → Generate a new API key**. Copie a chave (`BREVO_API_KEY`).
3. **Senders, Domains & Dedicated IPs → Senders**: o e-mail da sua conta já vale como remetente; ele será o `EMAIL_FROM`.

> Plano B para a apresentação (não depende de e-mail): crie uma conta já verificada pelo terminal, com o `.env` apontando para o Supabase:
> `npm run empresa:criar -- --email demo@exemplo.com --senha SuaSenha123 --nome "Escritório Demo" --vincular-seed`
> O `--vincular-seed` passa os processos fictícios (se você rodou `db:seed`) para essa conta.

---

## 3. API no Render (Web Service)

1. Em render.com, entre com o GitHub. **New + → Web Service** → escolha o repositório `jurimetria-ia`.
2. Configure:

   | Campo | Valor |
   |---|---|
   | Name | `jurimetria-api` (ou outro) |
   | Region | a mais próxima (ex.: Ohio) |
   | Branch | `main` |
   | **Root Directory** | `backend` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | Free |

3. Em **Advanced → Health Check Path**: `/api/health`.
4. **Environment Variables**:

   | Chave | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `20` |
   | `DATABASE_URL` | a URI do Session pooler (com a senha) |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | um segredo **novo** (gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   | `ANTHROPIC_API_KEY` | sua chave da Anthropic (de preferência uma **nova**) |
   | `ANTHROPIC_MODEL` | `claude-sonnet-5` |
   | `BREVO_API_KEY` | a chave do passo 2 |
   | `EMAIL_FROM` | o e-mail remetente da Brevo |
   | `FRONTEND_URL` | deixe para o passo 5 (ou `http://localhost:5173` por enquanto) |

5. **Create Web Service**. Ao terminar, abra `https://SEU-API.onrender.com/api/health`: deve mostrar `"database":"connected"`.
   Anote a URL da API.

---

## 4. Site no Render (Static Site)

1. **New + → Static Site** → mesmo repositório.
2. Configure:

   | Campo | Valor |
   |---|---|
   | Name | `jurimetria-app` (ou outro) |
   | Branch | `main` |
   | **Root Directory** | `frontend` |
   | Build Command | `npm install && npm run build` |
   | Publish Directory | `dist` |

3. **Environment Variables**: `VITE_API_URL` = a URL da API do passo 3, **sem `/api` e sem barra no final**
   (ex.: `https://jurimetria-api.onrender.com`). Essa variável é lida na hora do build.
4. Aba **Redirects/Rewrites** → adicionar regra: Source `/*`, Destination `/index.html`, Action **Rewrite**.
   (Sem isso, atualizar a página em `/processos` dá "Not Found".)
5. **Create Static Site**. Anote a URL do site.

---

## 5. Ajuste final do CORS

No Web Service da API → **Environment** → `FRONTEND_URL` = URL do site do passo 4 (sem barra no final). Salve (o Render reinicia a API).

---

## 6. Teste completo

1. Abra o site → **Cadastrar** → o código chega por e-mail → confirme → entre.
2. Cadastre um processo, vincule os pedidos, adicione uma sentença e envie para análise (usa a API da Anthropic).
3. Veja Dashboard e Jurimetria.

---

## Antes da apresentação

- **Acorde a API 1 minuto antes**: no plano gratuito ela dorme após 15 min parada e a primeira requisição leva 30 a 50 s. Abra `/api/health` antes de começar.
- **Supabase gratuito pausa o projeto após ~1 semana sem uso**: entre no painel do Supabase na véspera e, se estiver pausado, clique em *Restore*.
- Cada análise de IA consome créditos da Anthropic; evite testes à toa.
- **Segredos**: a chave da Anthropic, a senha do Gmail e o JWT que já passaram por chats/arquivos devem ser trocados. Em produção use valores novos, só no painel do Render (nunca no GitHub).

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `/api/health` mostra `"database":"unavailable"` | `DATABASE_URL` errada (senha com caractere especial, ou não é a URI do *Session pooler*) ou falta `DB_SSL=true` |
| Site abre mas dá "Não foi possível conectar ao servidor" | `VITE_API_URL` errada ou com `/api` no fim (corrija e faça **Manual Deploy → Clear build cache & deploy**) |
| Erro de CORS no console do navegador | `FRONTEND_URL` diferente da URL real do site (confira `https`, sem barra final) |
| Cadastro cria a conta mas não chega e-mail | `BREVO_API_KEY`/`EMAIL_FROM` ausentes ou remetente não validado; use o Plano B (`empresa:criar`) |
| Página dá "Not Found" ao atualizar | falta a regra de Rewrite `/*` → `/index.html` |
