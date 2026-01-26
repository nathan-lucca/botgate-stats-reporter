# @botgate/botgate-stats-reporter

[![npm version](https://img.shields.io/npm/v/@botgate/botgate-stats-reporter.svg)](https://www.npmjs.com/package/@botgate/botgate-stats-reporter)
[![license](https://img.shields.io/npm/l/@botgate/botgate-stats-reporter.svg)](https://github.com/nathan-lucca/botgate-stats-reporter/blob/main/LICENSE)

O módulo oficial do **BotGate** para simplificar a integração de bots Discord com a nossa plataforma. Automatize o envio de estatísticas, monitore votos e gerencie o plano do seu bot com facilidade.

## 📦 Instalação

```bash
npm install @botgate/botgate-stats-reporter
```

## 🚀 Como usar

A biblioteca foi projetada para ser "configure e esqueça". Ela gerencia automaticamente o intervalo de postagem com base no seu plano (Tier).

### Exemplo com Discord.js

```javascript
import { Client, GatewayIntentBits } from "discord.js";
import { BotGateReporter } from "@botgate/botgate-stats-reporter";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const reporter = new BotGateReporter({
  botId: "SEU_BOT_ID",
  apiKey: "SUA_API_KEY",
});

client.once("ready", () => {
  console.log(`Bot logado como ${client.user.tag}`);

  // Inicia o monitoramento automático de estatísticas e heartbeats
  reporter.start(client);
});

client.login("SEU_TOKEN_DISCORD");
```

## 🛠️ Métodos Principais

| Método                             | Descrição                                                        |
| :--------------------------------- | :--------------------------------------------------------------- |
| `start(client)`                    | Inicia o loop automático de estatísticas e heartbeats.           |
| `stop()`                           | Interrompe todos os processos em segundo plano.                  |
| `getBotInfo()`                     | Obtém dados completos do perfil do bot e do plano atual.         |
| `getBotVotes(botId?, limit?)`      | Consulta os últimos eleitores e estatísticas de votação.         |
| `getApiUsage()`                    | Verifica o consumo mensal da sua cota de API.                    |
| `getStatsHistory(botId?, period?)` | Retorna o histórico de crescimento para gráficos.                |
| `sendHeartbeat()`                  | Envia um sinal de vida manual (Exclusivo para o plano Business). |

## 🧠 Sincronização Inteligente

O `@botgate/botgate-stats-reporter` é reativo. Se você fizer um upgrade de plano no painel do BotGate, o bot detectará os novos limites na próxima comunicação com o servidor e ajustará o intervalo de postagem automaticamente, sem precisar reiniciar o processo.

- **Upgrade (Hot-Swap)**: Acelera o intervalo de envio conforme o novo Tier.
- **Grace Period**: Tolerância de segurança para evitar erros 429 por latência de rede.
- **Resiliência**: Tratamento automático de erros e tentativas de reenvio em caso de falhas temporárias.

## 🔗 Links Úteis

- [Documentação Oficial](https://docs-botgate.vercel.app/)
- [Painel do Desenvolvedor](https://botgate-site.vercel.app/settings)
- [Suporte no Discord](https://www.discord.gg/xK4r9HqKKf)

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
