# Deploy no Netlify — AISO Lite R

## 1. Não há dependências para instalar
Este app é um **ficheiro HTML único, já compilado** (React + tudo empacotado
inline num único `<script>`). Não existe `package.json`, não há `npm install`,
não há passo de build. Para o Netlify isto significa:

- **Build command:** deixar em branco (ou `echo "no build"`)
- **Publish directory:** `.` (a raiz desta pasta, onde está o `index.html`)

Arrastar esta pasta para o Netlify Drop, ou ligar um repositório Git com
estes ficheiros, é suficiente.

## 2. Variáveis de ambiente — Claude, ChatGPT e Gemini passam pelo servidor (Netlify Functions)
Implementei um proxy para os três: as chamadas de IA que a app realmente
usa (extração PICE de licenças/facturas e o Factura Analizador embutido)
já não pedem chave ao utilizador — passam por
`netlify/edge-functions/claude-proxy.js`, `openai-proxy.js` e `gemini-proxy.js`
(Edge Functions, não Functions normais — ver nota abaixo), que usam as
chaves guardadas **apenas no servidor**.

**Precisas de configurar até 3 variáveis de ambiente no Netlify**
(Site settings → Environment variables), conforme os fornecedores que
uses na app:

- `ANTHROPIC_API_KEY` — para o Claude
- `OPENAI_API_KEY` — para o ChatGPT/GPT-4o
- `GEMINI_API_KEY` — para o Gemini

Só precisas de configurar as que os teus utilizadores realmente vão usar;
sem uma delas configurada, essa funcionalidade específica devolve um erro
claro (vindo do teu servidor) a avisar qual variável falta — as outras
continuam a funcionar normalmente.

⚠️ **Limitações conhecidas (não foram alteradas):**
- O Factura Analizador tem um modo "standalone" (aberto como ficheiro
  separado, fora da app principal) que continua a chamar Claude, OpenAI e
  Gemini directamente com a chave do utilizador. No uso normal — embutido
  dentro da AISO Console, que é como está a ser servido no Netlify — não é
  afectado.
- O painel de chat "Androisa" (assistente conversacional) tem uma função
  de chamada ao Gemini no código que já não é invocada em lado nenhum da
  interface actual (parece ter sido substituída por outra funcionalidade)
  — não a toquei por ser código morto, sem efeito prático.

## 3. Único ponto que PRECISA da tua decisão: sincronização "Salas" (Androisa)
O app tem uma funcionalidade de colaboração em tempo real que chama:

- `/api/sync/rooms`
- `/api/sync/room/:id/item`
- `/api/sync/room/:id/items`
- `/api/sync/room/:id/globals`

Estes são **caminhos relativos** — a app espera um backend próprio a correr
na mesma origem. O Netlify, como hosting estático, **não** serve estas
rotas por si só; vão devolver 404.

Isto **não parte o resto do app** — o código já trata isto com
`try/catch` e falha em silêncio (a funcionalidade de "salas de colaboração"
simplesmente não vai funcionar; tudo o resto continua normal).

Preciso de saber de ti para decidir o próximo passo:
- **(a)** Já tens um backend (Node/Express, etc.) algures a servir estas
  rotas `/api/sync/*`? Se sim, dou-te um redirect no `netlify.toml` a
  apontar para lá (aí sim, se esse backend precisar de segredos, tornam-se
  env vars do Netlify).
- **(b)** Não tens backend e não precisas da colaboração em tempo real
  agora — fico apenas com o aviso acima e não faço mais nada.
- **(c)** Queres que eu implemente essas rotas como Netlify Functions
  (precisaria de saber onde os dados das "salas" devem ficar guardados —
  ex. Netlify Blobs, uma base de dados externa, etc.).

## Nota técnica: porque são Edge Functions, e não Functions normais
As Netlify Functions "normais" (as que usámos inicialmente) têm um limite de
execução de 10 segundos no plano gratuito (26s no Pro) — tempo insuficiente
para a Anthropic/OpenAI/Gemini responderem a um pedido de análise de uma
factura em PDF, o que causava erro 504 (timeout). As Edge Functions não têm
esse problema: o tempo passado à espera de uma resposta externa não conta
para o limite de execução. Por isso os 3 proxies estão agora em
`netlify/edge-functions/`, não em `netlify/functions/`.

## Ficheiros nesta pasta
- `index.html` — o app (renomeado a partir do ficheiro que te entreguei)
- `netlify.toml` — configuração de deploy, redirects e headers de segurança
- `netlify/edge-functions/claude-proxy.js` — proxy server-side para o Claude
- `netlify/edge-functions/openai-proxy.js` — proxy server-side para o ChatGPT
- `netlify/edge-functions/gemini-proxy.js` — proxy server-side para o Gemini
- `README.md` — este ficheiro
