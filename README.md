# whatsapp-transcribe-bot

Bot de WhatsApp que transcreve áudios pra texto automaticamente. Encaminha um áudio, recebe o texto de volta na mesma conversa.

Stack: Cloudflare Workers (TypeScript) + WhatsApp Business Cloud API (Meta) + Groq Whisper API (`whisper-large-v3`). Sem servidor pra manter, sem custo pro uso pessoal/grupo pequeno.

## Como funciona

```
WhatsApp (você/amigos) → áudio
    → Meta Cloud API dispara webhook
    → Cloudflare Worker
        1. checa remetente contra whitelist
        2. baixa áudio (Graph API)
        3. transcreve (Groq Whisper API)
        4. responde o texto na mesma conversa (Graph API)
```

## Setup

### 1. Meta App + WhatsApp Cloud API

1. Crie um app em [developers.facebook.com](https://developers.facebook.com/), adicione o produto **WhatsApp**.
2. Na aba de configuração do WhatsApp, anote o **número de teste** e o `Phone number ID`.
3. Gere um token de acesso (temporário pra testar, ou um token de sistema permanente pra produção).
4. Em **API Setup → To**, adicione seu número e os números dos seus amigos como destinatários de teste (obrigatório no tier de teste da Cloud API).

### 2. Groq

1. Crie conta em [console.groq.com](https://console.groq.com/).
2. Gere uma API key.

### 3. Deploy do Worker

```bash
npm install
npx wrangler login
npx wrangler deploy
```

Isso gera uma URL pública tipo `https://whatsapp-transcribe-bot.SEUUSER.workers.dev`.

### 4. Configurar secrets

```bash
npx wrangler secret put WHATSAPP_TOKEN
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
npx wrangler secret put WHATSAPP_VERIFY_TOKEN   # string arbitrária que você escolhe
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put ALLOWED_NUMBERS          # ex: 5511999999999,5511888888888 (formato E.164, sem +)
```

### 5. Configurar o webhook no Meta App

1. Em **WhatsApp → Configuration → Webhook**, aponte pra `https://SEU-WORKER.workers.dev/webhook`.
2. Use o mesmo valor de `WHATSAPP_VERIFY_TOKEN` no campo de verificação.
3. Inscreva no campo `messages`.

Pronto — encaminhe um áudio pro número de teste e o bot responde com o texto transcrito.

## Desenvolvimento local

```bash
npm run dev          # wrangler dev, com hot reload
npm test              # roda a suíte de testes (vitest)
```

Copie `.dev.vars.example` pra `.dev.vars` e preencha com valores reais pra testar localmente (esse arquivo não vai pro git).

## CI/CD

`.github/workflows/ci-cd.yml` roda em todo push/PR:

- **test**: `npm test` + `tsc --noEmit`.
- **deploy**: só em push pra `main` e só se `test` passar — publica via `wrangler deploy`.

Pra habilitar o deploy automático, cadastre dois secrets no repositório (**Settings → Secrets and variables → Actions → New repository secret**):

- `CLOUDFLARE_API_TOKEN` — gere em [dash.cloudflare.com](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → template **Edit Cloudflare Workers**.
- `CLOUDFLARE_ACCOUNT_ID` — visível na URL do dashboard da Cloudflare, ou rode `npx wrangler whoami`.

Isso é separado dos secrets do Worker (`WHATSAPP_TOKEN` etc, passo 4 acima) — aqueles ficam só no Cloudflare via `wrangler secret put`, não passam pelo GitHub.
