# Guia de deploy

Arquitetura alvo: frontend na **Vercel**, backend no **Render**, PostgreSQL num provedor gerenciado (**Neon**, **Supabase** ou **Railway** — qualquer um funciona, o backend só precisa de uma `DATABASE_URL` padrão). Nada neste guia é específico de um provedor a ponto de travar a escolha; troque livremente por equivalentes.

Nenhum passo aqui é automático — cada `INSERT`/deploy/variável de ambiente é uma ação manual e deliberada, especialmente o `seed.sql` (ver aviso na seção 3).

## 1. Banco de dados

1. Crie um banco PostgreSQL vazio no provedor escolhido (Neon/Supabase/Railway têm todos um plano gratuito suficiente para o TCC).
2. Copie a *connection string* fornecida pelo provedor (formato `postgresql://usuario:senha@host:porta/banco?sslmode=require`).
3. Aplique o schema:
   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   ```
4. **Opcional, só para demonstração** (nunca em um banco que vá virar produção de verdade):
   ```bash
   psql "$DATABASE_URL" -f database/seed.sql
   ```

## 2. Backend (Render)

1. Crie um "Web Service" no Render apontando para a pasta `backend/` do repositório (root directory = `backend`).
2. Build command: `npm install`. Start command: `npm start`.
3. Variáveis de ambiente (Render → Environment):

   | Variável | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | connection string do passo 1 (com `sslmode=require` se o provedor exigir) |
   | `FRONTEND_URL` | URL final do frontend na Vercel (ex: `https://seu-projeto.vercel.app`) — **sem barra no final** |
   | `ANTHROPIC_API_KEY` | chave real da Anthropic (nunca commitar em nenhum arquivo do repositório) |
   | `ANTHROPIC_MODEL` | `claude-sonnet-5` (ou outro modelo disponível — ver comentário em `backend/.env.example`) |

   `PORT` não precisa ser definida — o Render injeta automaticamente e o código já lê `process.env.PORT` com fallback.
4. Depois do primeiro deploy, confirme a saúde do serviço:
   ```bash
   curl https://seu-backend.onrender.com/api/health
   ```
   Resposta esperada: `{"status":"ok","service":"jurimetria-api","database":"connected"}`. Se `database` vier `"unavailable"`, revise `DATABASE_URL` — o endpoint nunca derruba o processo por isso, então o serviço "parece no ar" mesmo com o banco mal configurado; sempre confira este campo, não só o status HTTP.
5. **Cold start (plano gratuito do Render):** a primeira requisição depois de um período de inatividade pode levar dezenas de segundos. O frontend já trata timeout/erro de rede com uma mensagem amigável (`src/services/api.js`), mas vale avisar quem for demonstrar o sistema ao vivo.

## 3. Frontend (Vercel)

1. Crie um projeto na Vercel apontando para a pasta `frontend/` (root directory = `frontend`). Framework preset: Vite.
2. Build command: `npm run build`. Output directory: `dist`.
3. Variável de ambiente:

   | Variável | Valor |
   |---|---|
   | `VITE_API_URL` | URL do backend no Render (ex: `https://seu-backend.onrender.com`), **sem `/api` no final** — o client já acrescenta |

4. `frontend/vercel.json` já está no repositório com o rewrite de SPA (`/(.*)` → `/index.html`), necessário para que rotas como `/processos/42` não retornem 404 ao dar refresh direto na URL.
5. Depois do deploy, atualize `FRONTEND_URL` no Render com a URL final da Vercel (passo 2.3) e faça um redeploy do backend — o CORS só libera origens explicitamente listadas.

## 4. Checklist final antes de considerar o deploy pronto

- [ ] `GET /api/health` no backend em produção responde `database: "connected"`.
- [ ] Login/CORS: abrir o frontend em produção e confirmar no console do navegador que não há erro de CORS ao chamar a API.
- [ ] Criar um processo, uma sentença e disparar uma análise por IA de ponta a ponta (só se `ANTHROPIC_API_KEY` estiver configurada) — confirmar que o status sai de Pendente para Concluída via polling.
- [ ] Confirmar que **nenhum arquivo `.env` com valores reais foi commitado** (`git log -p -- '*.env'` não deve ter nada além de `.env.example`).
- [ ] Confirmar que `database/seed.sql` **não** foi aplicado no banco de produção final (só use em ambiente de demonstração/dev).
- [ ] Rodar `npm test` no backend antes do deploy (nenhum teste depende de rede ou banco real, então não há motivo para pular este passo em nenhum ambiente).
- [ ] Testar o refresh direto numa rota profunda do frontend (ex: `/jurimetria`) para confirmar que o rewrite de SPA está ativo.
- [ ] Verificar os limites de rate limiting (`express-rate-limit`, 300 req/15min por padrão) fazem sentido para o uso esperado da demonstração.
