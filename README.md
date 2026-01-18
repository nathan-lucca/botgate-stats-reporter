# @botgate/stats-reporter

[![npm version](https://img.shields.io/npm/v/@botgate/stats-reporter.svg)](https://www.npmjs.com/package/@botgate/stats-reporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Módulo oficial do **BotGate** para reportar estatísticas do seu bot Discord automaticamente.

## 📦 Instalação

```bash
npm install @botgate/stats-reporter
```

ou com yarn:

```bash
yarn add @botgate/stats-reporter
```

## 🚀 Uso Rápido

### JavaScript (CommonJS)

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const BotGateReporter = require('@botgate/stats-reporter');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Criar reporter
const reporter = new BotGateReporter({
    botId: '123456789012345678',
    apiKey: 'sua_chave_api_aqui',
    debug: true // Opcional: ativa logs
});

client.on('ready', () => {
    console.log(`Bot online: ${client.user.tag}`);
    
    // Iniciar reporter
    reporter.start(client);
});

client.login('seu_token_aqui');
```

### TypeScript

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { BotGateReporter } from '@botgate/stats-reporter';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const reporter = new BotGateReporter({
    botId: '123456789012345678',
    apiKey: 'sua_chave_api_aqui',
    updateInterval: 30 * 60 * 1000, // 30 minutos (padrão)
    debug: true
});

client.on('ready', () => {
    console.log(`Bot online: ${client.user?.tag}`);
    reporter.start(client);
});

client.login(process.env.DISCORD_TOKEN!);
```

## ⚙️ Configuração

### Opções do Constructor

```typescript
interface BotGateConfig {
    botId: string;           // ID do seu bot (obrigatório)
    apiKey: string;          // Chave API do BotGate (obrigatório)
    apiUrl?: string;         // URL da API (padrão: https://api.botgate.com)
    updateInterval?: number; // Intervalo de atualização em ms (padrão: 30 min)
    debug?: boolean;         // Ativa logs de debug (padrão: false)
}
```

### Exemplo Completo

```javascript
const reporter = new BotGateReporter({
    botId: '123456789012345678',
    apiKey: process.env.BOTGATE_API_KEY,
    apiUrl: 'https://api.botgate.com', // Opcional
    updateInterval: 15 * 60 * 1000,    // 15 minutos
    debug: process.env.NODE_ENV === 'development'
});
```

## 📊 Métodos

### `start(client: Client): void`

Inicia o reporter e começa a enviar estatísticas automaticamente.

```javascript
reporter.start(client);
```

### `stop(): void`

Para o reporter e cancela atualizações automáticas.

```javascript
reporter.stop();
```

### `sendStats(): Promise<BotGateResponse>`

Envia estatísticas manualmente (útil para testes).

```javascript
const result = await reporter.sendStats();
console.log(result.success); // true ou false
```

### `verifyApiKey(): Promise<boolean>`

Verifica se a API key é válida.

```javascript
const isValid = await reporter.verifyApiKey();
if (!isValid) {
    console.error('API key inválida!');
}
```

### `getBotInfo(): Promise<any>`

Obtém informações do bot no BotGate.

```javascript
const botInfo = await reporter.getBotInfo();
console.log(botInfo.name);
console.log(botInfo.total_votes);
```

### `isActive(): boolean`

Verifica se o reporter está rodando.

```javascript
if (reporter.isActive()) {
    console.log('Reporter está ativo');
}
```

### `getConfig(): BotGateConfig`

Obtém a configuração atual.

```javascript
const config = reporter.getConfig();
console.log(config.updateInterval);
```

## 🎯 Exemplos Avançados

### Com Tratamento de Erros

```javascript
const reporter = new BotGateReporter({
    botId: process.env.BOT_ID,
    apiKey: process.env.BOTGATE_API_KEY,
    debug: true
});

client.on('ready', async () => {
    // Verificar API key antes de iniciar
    const isValid = await reporter.verifyApiKey();
    
    if (!isValid) {
        console.error('❌ API key inválida! Verifique suas credenciais.');
        return;
    }
    
    console.log('✅ API key válida!');
    reporter.start(client);
    
    // Enviar stats imediatamente
    try {
        const result = await reporter.sendStats();
        if (result.success) {
            console.log('📊 Estatísticas enviadas com sucesso!');
        }
    } catch (error) {
        console.error('Erro ao enviar stats:', error);
    }
});
```

### Com Múltiplos Shards

```javascript
const { ShardingManager } = require('discord.js');

const manager = new ShardingManager('./bot.js', {
    token: process.env.DISCORD_TOKEN,
    totalShards: 'auto'
});

manager.on('shardCreate', shard => {
    console.log(`Shard ${shard.id} iniciada`);
    
    // O reporter detecta automaticamente o número de shards
    // e envia essa informação para o BotGate
});

manager.spawn();
```

### Atualização Manual Periódica

```javascript
// Desativar auto-update e controlar manualmente
const reporter = new BotGateReporter({
    botId: process.env.BOT_ID,
    apiKey: process.env.BOTGATE_API_KEY,
    updateInterval: 0 // Desativa auto-update
});

client.on('ready', () => {
    reporter.start(client);
    
    // Atualizar a cada 1 hora
    setInterval(async () => {
        const result = await reporter.sendStats();
        console.log(`Stats atualizadas: ${result.success}`);
    }, 60 * 60 * 1000);
});
```

### Com Eventos Customizados

```javascript
client.on('ready', () => {
    reporter.start(client);
});

// Atualizar stats quando entrar em um novo servidor
client.on('guildCreate', async (guild) => {
    console.log(`Entrei no servidor: ${guild.name}`);
    await reporter.sendStats();
});

// Atualizar stats quando sair de um servidor
client.on('guildDelete', async (guild) => {
    console.log(`Saí do servidor: ${guild.name}`);
    await reporter.sendStats();
});
```

## 🔑 Obtendo sua API Key

1. Acesse [BotGate](https://botgate.com)
2. Faça login com Discord
3. Vá em **Meus Bots**
4. Selecione seu bot
5. Copie a **API Key** na seção de configurações

## 📊 Dados Enviados

O reporter envia automaticamente:

- **Server Count**: Número de servidores
- **User Count**: Número total de usuários (aproximado)
- **Shard Count**: Número de shards (se aplicável)
- **Timestamp**: Data/hora da atualização

## 🛡️ Segurança

- ✅ **Nunca** compartilhe sua API key
- ✅ Use variáveis de ambiente (`.env`)
- ✅ Adicione `.env` ao `.gitignore`
- ✅ A API key é enviada via HTTPS
- ✅ Nenhum dado sensível é coletado

## 🐛 Debug

Ative o modo debug para ver logs detalhados:

```javascript
const reporter = new BotGateReporter({
    botId: '123456789012345678',
    apiKey: 'sua_api_key',
    debug: true // Ativa logs
});
```

Exemplo de output:
```
[BotGate Reporter] [2024-01-13T22:00:00.000Z] BotGate Reporter initialized
[BotGate Reporter] [2024-01-13T22:00:01.000Z] Bot ready: MeuBot#1234
[BotGate Reporter] [2024-01-13T22:00:02.000Z] Stats sent successfully: 150 servers, 45000 users
[BotGate Reporter] [2024-01-13T22:00:02.000Z] Auto-update enabled (every 30 minutes)
```

## ❓ FAQ

### O reporter funciona com Discord.js v13?

Não, o reporter requer **Discord.js v14+**. Para v13, use a versão `0.x` do pacote.

### Posso usar em bots com sharding?

Sim! O reporter detecta automaticamente shards e envia a informação correta.

### Com que frequência devo atualizar as stats?

Recomendamos **30 minutos** (padrão). Não atualize com muita frequência para evitar rate limits.

### O que acontece se a API estiver offline?

O reporter tentará novamente na próxima atualização agendada. Nenhum erro será lançado.

### Posso usar em múltiplos bots?

Sim! Crie uma instância do reporter para cada bot, cada um com sua própria API key.

## 📄 Licença

MIT © BotGate Team

## 🔗 Links

- [Website](https://botgate.com)
- [Documentação](https://docs.botgate.com)
- [GitHub](https://github.com/botgate/stats-reporter)
- [NPM](https://www.npmjs.com/package/@botgate/stats-reporter)
- [Suporte](https://discord.gg/botgate)

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para mais detalhes.

## 📝 Changelog

### v1.0.0 (2024-01-13)
- 🎉 Lançamento inicial
- ✅ Suporte para Discord.js v14
- ✅ Auto-update de estatísticas
- ✅ TypeScript support
- ✅ Detecção automática de shards
