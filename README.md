# 📊 BotGate Stats Reporter

[![npm version](https://img.shields.io/npm/v/@botgate/stats-reporter.svg)](https://www.npmjs.com/package/@botgate/stats-reporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

Pacote oficial do **BotGate** para reportar estatísticas do seu bot Discord automaticamente para a plataforma BotGate.

## ✨ Funcionalidades

- ✅ **Envio automático** de estatísticas (servidores, usuários, shards)
- ⏰ **Intervalo configurável** de atualização
- 🔄 **Retry automático** em caso de falha
- 🔐 **Verificação de API key**
- 📝 **Logs detalhados** (modo debug)
- 🎯 **TypeScript completo** com tipos exportados
- 🚀 **Fácil integração** com Discord.js
- 💪 **Robusto e confiável**

## 📦 Instalação

```bash
npm install @botgate/stats-reporter
```

ou

```bash
yarn add @botgate/stats-reporter
```

## 🚀 Uso Básico

### JavaScript

```javascript
const { Client, GatewayIntentBits } = require("discord.js");
const { BotGateReporter } = require("@botgate/stats-reporter");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const reporter = new BotGateReporter({
  botId: "YOUR_BOT_ID",
  apiKey: "YOUR_API_KEY",
  debug: true, // Opcional
});

client.once("ready", () => {
  console.log(`Bot logado como ${client.user.tag}`);
  reporter.start(client);
});

client.login("YOUR_BOT_TOKEN");
```

### TypeScript

```typescript
import { Client, GatewayIntentBits } from "discord.js";
import { BotGateReporter } from "@botgate/stats-reporter";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const reporter = new BotGateReporter({
  botId: "YOUR_BOT_ID",
  apiKey: "YOUR_API_KEY",
  debug: true, // Opcional
});

client.once("ready", () => {
  console.log(`Bot logado como ${client.user.tag}`);
  reporter.start(client);
});

client.login("YOUR_BOT_TOKEN");
```

## 📖 Documentação Completa

### Configuração

```typescript
interface BotGateConfig {
  // Obrigatório
  botId: string; // ID do bot no Discord
  apiKey: string; // API key do BotGate

  // Opcional
  debug?: boolean; // Ativar logs (padrão: false)
}
```

### Métodos Principais

#### `start(client: Client): void`

Inicia o reporter e começa a enviar estatísticas automaticamente.

```javascript
reporter.start(client);
```

#### `stop(): void`

Para o reporter e cancela atualizações automáticas.

```javascript
reporter.stop();
```

#### `sendStats(): Promise<BotGateResponse>`

Envia estatísticas manualmente (sem aguardar o intervalo).

```javascript
try {
  const response = await reporter.sendStats();
  console.log("Stats enviadas:", response);
} catch (error) {
  console.error("Erro:", error);
}
```

#### `verifyApiKey(): Promise<boolean>`

Verifica se a API key é válida.

```javascript
const isValid = await reporter.verifyApiKey();
if (isValid) {
  console.log("API key válida!");
}
```

#### `getBotInfo(): Promise<BotInfo>`

Obtém informações do bot no BotGate.

```javascript
const botInfo = await reporter.getBotInfo();
console.log("Nome:", botInfo.name);
console.log("Votos:", botInfo.stats.votes);
console.log("Avaliação:", botInfo.stats.rating);
```

#### `getConfig(): Readonly<Required<BotGateConfig>>`

Retorna a configuração atual.

```javascript
const config = reporter.getConfig();
console.log("Intervalo:", config.updateInterval);
```

#### `isActive(): boolean`

Verifica se o reporter está ativo.

```javascript
if (reporter.isActive()) {
  console.log("Reporter está rodando");
}
```

#### `getFailedAttempts(): number`

Retorna o número de tentativas falhadas consecutivas.

```javascript
const failures = reporter.getFailedAttempts();
console.log("Falhas consecutivas:", failures);
```

#### `refreshTier(): Promise<boolean>`

Atualiza o tier e intervalo de atualização consultando a API.

**Use este método após fazer upgrade do tier** para aplicar o novo intervalo sem reiniciar o bot.

```javascript
// Após fazer upgrade para Premium no site
await reporter.refreshTier();
// O intervalo será automaticamente ajustado (ex: 30min → 5min)
```

> **💡 Dica**: Quando você faz upgrade do tier (Free → Premium → Business), chame `refreshTier()` para que o reporter comece a enviar stats com o novo intervalo imediatamente!

## 🔑 Obtendo sua API Key

1. Acesse [BotGate](https://botgate.com)
2. Faça login com sua conta Discord
3. Vá para o painel do seu bot
4. Copie sua API key na seção "Configurações"

⚠️ **Importante**: Nunca compartilhe sua API key publicamente!

## 📊 Estatísticas Enviadas

O reporter envia automaticamente:

- **Número de servidores** (`serverCount`)
- **Número total de usuários** (`userCount`)
- **Número de shards** (`shardCount`)
- **Timestamp** do envio

## 🔄 Retry Automático

O reporter tenta enviar as estatísticas até 3 vezes (configurável) em caso de falha:

```javascript
const reporter = new BotGateReporter({
  botId: "YOUR_BOT_ID",
  apiKey: "YOUR_API_KEY",
  retryAttempts: 3, // Tentar 3 vezes
  retryDelay: 5000, // Aguardar 5s entre tentativas
});
```

## 🐛 Debug

Ative o modo debug para ver logs detalhados:

```javascript
const reporter = new BotGateReporter({
  botId: "YOUR_BOT_ID",
  apiKey: "YOUR_API_KEY",
  debug: true, // ✅ Ativar logs
});
```

Exemplo de logs:

```
[BotGate Reporter] [2026-01-18T14:30:00.000Z] ✅ BotGate Reporter initialized
[BotGate Reporter] [2026-01-18T14:30:05.000Z] 🤖 Bot ready: MyBot#1234
[BotGate Reporter] [2026-01-18T14:30:06.000Z] 📤 Stats sent successfully (attempt 1)
{
  "servers": 1250,
  "users": 50000,
  "shards": 1
}
[BotGate Reporter] [2026-01-18T14:30:06.000Z] ⏰ Auto-update enabled (every 30 minutes)
```

## 🛡️ Tratamento de Erros

O reporter lida automaticamente com erros comuns:

```javascript
client.once("ready", async () => {
  reporter.start(client);

  // Verificar se a API key é válida
  const isValid = await reporter.verifyApiKey();
  if (!isValid) {
    console.error("❌ API key inválida!");
    process.exit(1);
  }
});
```

## 🔧 Exemplos Avançados

### Envio Manual em Eventos

```javascript
client.on("guildCreate", async (guild) => {
  console.log(`➕ Entrou no servidor: ${guild.name}`);

  // Enviar stats imediatamente
  await reporter.sendStats();
});

client.on("guildDelete", async (guild) => {
  console.log(`➖ Saiu do servidor: ${guild.name}`);

  // Enviar stats imediatamente
  await reporter.sendStats();
});
```

### Atualizar Tier Após Upgrade

```javascript
// Comando para atualizar o tier após fazer upgrade no site
client.on("messageCreate", async (message) => {
  if (
    message.content === "!refresh-tier" &&
    message.author.id === "SEU_USER_ID"
  ) {
    message.reply("🔄 Atualizando tier...");

    const success = await reporter.refreshTier();

    if (success) {
      message.reply("✅ Tier atualizado! Novo intervalo aplicado.");
    } else {
      message.reply("❌ Erro ao atualizar tier.");
    }
  }
});
```

### Graceful Shutdown

```javascript
process.on("SIGINT", () => {
  console.log("🛑 Encerrando...");
  reporter.stop();
  client.destroy();
  process.exit(0);
});
```

### Monitoramento de Falhas

```javascript
setInterval(() => {
  const failures = reporter.getFailedAttempts();
  if (failures > 5) {
    console.error(`⚠️ Muitas falhas consecutivas: ${failures}`);
    // Enviar alerta, etc.
  }
}, 60000); // Verificar a cada minuto
```

## 🌐 API Endpoints Completos

O reporter se comunica com a API v1 do BotGate. Todos os endpoints requerem autenticação via API key no header `Authorization: Bearer <api_key>`.

### 📤 POST `/api/v1/bots/stats`

Envia estatísticas do bot (servidores, usuários, shards).

**Request Body:**

```json
{
  "botId": "123456789012345678",
  "serverCount": 1250,
  "userCount": 50000,
  "shardCount": 1,
  "timestamp": 1705678901234
}
```

**Response:**

```json
{
  "success": true,
  "message": "Stats updated successfully",
  "data": {
    "botId": "123456789012345678",
    "botName": "MyBot",
    "serverCount": 1250,
    "userCount": 50000,
    "shardCount": 1,
    "updatedAt": "2026-01-19T07:00:00.000Z"
  }
}
```

### ✅ GET `/api/v1/verify`

Verifica se a API key é válida e retorna informações do tier.

**Response:**

```json
{
  "success": true,
  "message": "API key is valid",
  "data": {
    "botId": "123456789012345678",
    "botName": "MyBot",
    "tier": {
      "name": "free",
      "apiCallsUsed": 150,
      "apiCallsLimit": 1000,
      "updateInterval": "30 minutes",
      "analyticsLevel": "basic",
      "historyDays": 7,
      "features": {
        "customWebhooks": false,
        "prioritySupport": false,
        "badge": "none"
      }
    }
  }
}
```

### 🤖 GET `/api/v1/bots/:botId`

Obtém informações completas do bot.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "123456789012345678",
    "name": "MyBot",
    "avatar": "...",
    "shortDescription": "Um bot incrível!",
    "stats": {
      "servers": 1250,
      "users": 50000,
      "shards": 1,
      "rating": 4.8,
      "reviews": 42
    },
    "owner": {
      "id": "987654321098765432",
      "username": "DevName"
    },
    "categories": [...],
    "features": [...],
    "commands": [...]
  }
}
```

### 🗳️ GET `/api/v1/bots/:botId/votes`

Retorna informações detalhadas sobre votos.

**Query Parameters:**

- `limit` - Número de últimos votantes (padrão: 10, máx: 50)

**Response:**

```json
{
  "success": true,
  "data": {
    "botId": "123456789012345678",
    "botName": "MyBot",
    "total": 5420,
    "monthly": 342,
    "weekly": 87,
    "today": 12,
    "recentVoters": [...],
    "monthlyHistory": [...]
  }
}
```

### 📊 GET `/api/v1/bots/:botId/analytics`

Retorna métricas e analytics detalhadas (requer tier Free ou superior).

**Response:**

```json
{
  "success": true,
  "data": {
    "botId": "123456789012345678",
    "botName": "MyBot",
    "growth": {
      "servers": {
        "current": 1250,
        "today": 15,
        "week": 120,
        "month": 450,
        "percentageChange": {
          "daily": "1.2",
          "weekly": "10.6",
          "monthly": "56.3"
        }
      },
      "votes": {...}
    },
    "engagement": {
      "votesPerDay": 12.5,
      "reviewsPerWeek": 2.3,
      "averageRating": 4.8
    },
    "trends": {
      "peakDays": ["Saturday", "Sunday", "Friday"],
      "dailyVotesLast7Days": [...]
    }
  }
}
```

### 📈 GET `/api/v1/bots/:botId/stats/history`

Retorna histórico de estatísticas para gráficos.

**Query Parameters:**

- `period` - Período: 'daily', 'weekly', 'monthly', 'all' (padrão: 'all')

**Response:**

```json
{
  "success": true,
  "data": {
    "botId": "123456789012345678",
    "botName": "MyBot",
    "daily": [
      {
        "date": "2026-01-19",
        "servers": 1250,
        "votes": 5420,
        "rating": "4.80"
      }
    ],
    "weekly": [...],
    "monthly": [...]
  }
}
```

### 📋 GET `/api/v1/usage`

Retorna informações sobre o uso atual da API.

**Response:**

```json
{
  "success": true,
  "data": {
    "bot": {
      "id": "123456789012345678",
      "name": "MyBot"
    },
    "tier": {
      "name": "free",
      "displayName": "Free",
      "features": {...}
    },
    "usage": {
      "apiCalls": {
        "used": 150,
        "limit": 1000,
        "remaining": 850,
        "percentage": 15.0,
        "status": "healthy",
        "message": "Uso normal"
      },
      "reset": {
        "at": "2026-02-01T00:00:00.000Z",
        "inDays": 13,
        "inHours": 312
      }
    },
    "updates": {
      "interval": "30 minutes",
      "lastUpdate": "2026-01-19T03:20:00.000Z",
      "nextUpdateAllowedAt": "2026-01-19T03:50:00.000Z",
      "minutesUntilNextUpdate": 25,
      "canUpdateNow": false
    },
    "statistics": {
      "avgCallsPerDay": 12.5,
      "estimatedDaysRemaining": 68,
      "usageHistory": [...]
    },
    "upgrade": null
  }
}
```

## 💎 Tiers e Limites

O BotGate oferece 3 tiers com diferentes limites e recursos:

### 🆓 Free Tier

- ✅ **1,500 chamadas de API/mês**
- ⏰ **Intervalo mínimo de atualização: 30 minutos**
- 📊 Analytics **básicas**
- 📅 Histórico de **7 dias**
- 🎯 Perfeito para começar!

### ⭐ Premium Tier ($9.99/mês)

- ✅ **10,000 chamadas de API/mês** (6.6x mais)
- ⏰ **Intervalo mínimo de atualização: 5 minutos** (6x mais rápido)
- 📊 Analytics **avançadas**
- 📅 Histórico de **90 dias**
- 🎨 Badge **Premium**
- 🔔 Webhooks customizados
- 💬 Suporte prioritário

### 🚀 Business Tier ($29.99/mês)

- ✅ **100,000 chamadas de API/mês** (66x mais)
- ⏰ **Intervalo mínimo de atualização: 1 minuto** (30x mais rápido)
- 📊 Analytics **enterprise**
- 📅 Histórico de **365 dias**
- 👑 Badge **Verified**
- 🎯 Domínio customizado
- 🚫 Sem anúncios
- 🔔 Webhooks customizados
- 💬 Suporte prioritário 24/7

> **💡 Ajuste Automático de Intervalo:**
>
> O reporter **detecta automaticamente** o seu tier ao iniciar e ajusta o intervalo de atualização:
>
> - 🆓 **Free**: Envia stats a cada **30 minutos**
> - ⭐ **Premium**: Envia stats a cada **5 minutos** (6x mais rápido!)
> - 🚀 **Business**: Envia stats a cada **1 minuto** (30x mais rápido!)
>
> **Após fazer upgrade**, você tem 2 opções:
>
> 1. **Reiniciar o bot** - O novo intervalo será aplicado automaticamente
> 2. **Chamar `reporter.refreshTier()`** - Atualiza sem reiniciar (recomendado!)

### 📊 Comparação de Limites

| Recurso          | Free       | Premium     | Business   |
| ---------------- | ---------- | ----------- | ---------- |
| Chamadas API/mês | 1,500      | 10,000      | 100,000    |
| Intervalo mínimo | 30 min     | 5 min       | 1 min      |
| Analytics        | Básicas    | Avançadas   | Enterprise |
| Histórico        | 7 dias     | 90 dias     | 365 dias   |
| Webhooks         | ❌         | ✅          | ✅         |
| Domínio custom   | ❌         | ❌          | ✅         |
| Badge            | Nenhum     | Premium     | Verified   |
| Suporte          | Comunidade | Prioritário | 24/7       |

## 🔒 Rate Limiting

A API implementa rate limiting baseado no tier:

- **Free**: 1,500 chamadas/mês, reset no dia 1º de cada mês
- **Premium**: 10,000 chamadas/mês
- **Business**: 100,000 chamadas/mês

Quando o limite é atingido, a API retorna:

```json
{
  "success": false,
  "error": "API limit exceeded",
  "message": "You have reached your monthly limit of 1500 API calls",
  "currentUsage": 1500,
  "limit": 1500,
  "resetIn": "13 days",
  "resetAt": "2026-02-01T00:00:00.000Z",
  "upgrade": {
    "message": "Upgrade to Premium for 10,000 calls/month",
    "url": "https://botgate.com/pricing"
  }
}
```

## 📝 Tipos TypeScript

Todos os tipos estão exportados e disponíveis:

```typescript
import {
  BotGateReporter,
  BotGateConfig,
  BotStats,
  BotGateResponse,
  BotInfo,
  createReporter,
} from "@botgate/stats-reporter";
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 🔗 Links

- [Website do BotGate](https://www.botgate.coden8n.shop/)
- [Discord de Suporte](https://discord.gg/xK4r9HqKKf)
- [GitHub](https://github.com/nathan-lucca/botgate-stats-reporter)
- [NPM](https://www.npmjs.com/package/@botgate/stats-reporter)

## 💬 Suporte

Precisa de ajuda? Entre em contato:

- 💬 Discord: [Servidor de Suporte](https://discord.gg/xK4r9HqKKf)
- 🌐 Website: [BotGate](https://www.botgate.coden8n.shop/)
- 🐛 Issues: [GitHub Issues](https://github.com/nathan-lucca/botgate-stats-reporter/issues)

## 🙏 Agradecimentos

Obrigado por usar o BotGate Stats Reporter! ❤️

---

Feito com ❤️ pela equipe BotGate
