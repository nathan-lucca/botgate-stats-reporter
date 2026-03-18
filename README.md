# @botgate/botgate-stats-reporter

[![npm version](https://img.shields.io/npm/v/@botgate/botgate-stats-reporter.svg)](https://www.npmjs.com/package/@botgate/botgate-stats-reporter)
[![license](https://img.shields.io/npm/l/@botgate/botgate-stats-reporter.svg)](https://github.com/nathan-lucca/botgate-stats-reporter/blob/main/LICENSE)

O módulo oficial do **BotGate** para simplificar a integração de bots Discord com a nossa plataforma. Automatize o envio de estatísticas, monitore votos em tempo real e gerencie o plano do seu bot com facilidade.

## 📦 Instalação

```bash
npm install @botgate/botgate-stats-reporter
```

## 🚀 Como usar

A biblioteca foi projetada para ser "configure e esqueça". Ela gerencia automaticamente o intervalo de postagem com base no seu plano (Tier).

### Integração Simples (com Votos em Tempo Real)

```javascript
import { Client, GatewayIntentBits } from "discord.js";
import { BotGateReporter } from "@botgate/botgate-stats-reporter";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const reporter = new BotGateReporter({
  botId: "SEU_BOT_ID",
  apiKey: "SUA_API_KEY",
  enableWebhooks: true, // Ativa o servidor interno para receber eventos (votos)
  lang: "pt-BR", // Opcional: "pt-BR" (padrão) ou "en-US"
  debug: true, // Opcional: true para logs detalhados, false para logs normais
});

// Evento disparado sempre que alguém votar no seu bot
reporter.on("vote", (vote) => {
  console.log(`🎁 Recompensando ${vote.username} por votar!`);
  // Sua lógica de cargos ou moedas aqui
});

client.once("ready", () => {
  reporter.start(client);
});

client.login("SEU_TOKEN_DISCORD");
```

### ⚙️ Configuração

O construtor `BotGateReporter` aceita as seguintes opções:

| Propriedade      | Tipo      | Padrão          | Descrição                                                       |
| :--------------- | :-------- | :-------------- | :-------------------------------------------------------------- |
| `botId`          | `string`  | **Obrigatório** | O ID do seu bot no Discord.                                     |
| `apiKey`         | `string`  | **Obrigatório** | Sua API Key obtida no painel do BotGate.                        |
| `enableWebhooks` | `boolean` | `false`         | Ativa o servidor HTTP interno para receber votos em tempo real. |
| `lang`           | `string`  | `"pt-BR"`       | Idioma dos logs e respostas da API (`pt-BR` ou `en-US`).        |
| `debug`          | `boolean` | `false`         | Ativa logs detalhados no console para depuração.                |

---

## 🛠️ Métodos Principais

| Método                        | Descrição                                                        |
| :---------------------------- | :--------------------------------------------------------------- |
| `start(client)`               | Inicia o loop automático de estatísticas e heartbeats.           |
| `stop()`                      | Interrompe todos os processos em segundo plano.                  |
| `handleShardMessage(msg)`     | **(Novo)** Processa mensagens IPC para emitir eventos em Shards. |
| `getBotInfo()`                | Obtém dados completos do perfil do bot e do plano atual.         |
| `getBotVotes(botId?, limit?)` | Consulta os últimos eleitores e estatísticas de votação.         |
| `getApiUsage()`               | Verifica o consumo mensal da sua cota de API.                    |
| `sendHeartbeat()`             | Envia um sinal de vida manual (Exclusivo para o plano Business). |

---

## ⚡ Monitoramento de Sharding

Se o seu bot utiliza `ShardingManager`, você deve centralizar o recebimento de Webhooks no Manager e repassar os dados para os shards.

**No Manager (processo pai):**
Repasse as mensagens de voto para os shards. O sistema do BotGate enviará os dados para a porta 8080 do seu servidor.

**No Shard (index.js):**

```javascript
const reporter = new BotGateReporter({
  botId: "BOT_ID",
  apiKey: "API_KEY",
  enableWebhooks: false, // Ativa o servidor interno para receber eventos (votos). OBS.: No sharding, é recomendado desativar o webhook no shard e ativar no manager.
  lang: "pt-BR",
  debug: true, // Opcional: true para logs detalhados, false para logs normais
});

// Escuta a ponte IPC entre os processos
process.on("message", (msg) => reporter.handleShardMessage(msg));

reporter.on("vote", (vote) => {
  client.users.send(vote.user_id, "Obrigado por votar! 💎");
});
```

## 🧠 Sincronização Inteligente

O `@botgate/botgate-stats-reporter` é reativo. Se você fizer um upgrade de plano no painel do BotGate, o bot detectará os novos limites na próxima comunicação com o servidor e ajustará o intervalo de postagem automaticamente.

- **Dual-Webhook**: Alertas de erro continuam indo para o seu Discord, enquanto os dados de voto vão direto para o código do bot.
- **Upgrade (Hot-Swap)**: Acelera o intervalo de envio conforme o novo Tier.
- **Grace Period**: Tolerância de segurança para evitar erros 429 por latência de rede.

## 🔗 Links Úteis

- [Documentação Oficial](https://docs.botgate.com.br/)
- [Painel do Desenvolvedor](https://www.botgate.com.br/settings)
- [Suporte no Discord](https://www.discord.gg/xK4r9HqKKf)

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
