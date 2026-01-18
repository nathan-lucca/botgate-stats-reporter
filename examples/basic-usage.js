const { Client, GatewayIntentBits } = require('discord.js');
const BotGateReporter = require('@botgate/stats-reporter');
require('dotenv').config();

// Criar client do Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Criar reporter do BotGate
const reporter = new BotGateReporter({
    botId: process.env.BOT_ID,
    apiKey: process.env.BOTGATE_API_KEY,
    debug: true // Ativa logs para ver o que está acontecendo
});

client.on('ready', async () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
    console.log(`📊 Servidores: ${client.guilds.cache.size}`);

    // Verificar se a API key é válida
    const isValid = await reporter.verifyApiKey();

    if (!isValid) {
        console.error('❌ API key inválida! Verifique suas credenciais no BotGate.');
        return;
    }

    console.log('✅ API key válida!');

    // Iniciar reporter
    reporter.start(client);
    console.log('📡 Reporter iniciado - Estatísticas serão enviadas automaticamente');
});

// Atualizar stats quando entrar em um novo servidor
client.on('guildCreate', async (guild) => {
    console.log(`➕ Entrei no servidor: ${guild.name} (${guild.memberCount} membros)`);

    // Enviar stats atualizadas imediatamente
    const result = await reporter.sendStats();
    if (result.success) {
        console.log('📊 Estatísticas atualizadas no BotGate!');
    }
});

// Atualizar stats quando sair de um servidor
client.on('guildDelete', async (guild) => {
    console.log(`➖ Saí do servidor: ${guild.name}`);

    // Enviar stats atualizadas
    const result = await reporter.sendStats();
    if (result.success) {
        console.log('📊 Estatísticas atualizadas no BotGate!');
    }
});

// Comando de teste para ver as stats
client.on('messageCreate', async (message) => {
    if (message.content === '!stats') {
        const stats = {
            servers: client.guilds.cache.size,
            users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
        };

        message.reply(`📊 **Estatísticas do Bot**\n🏠 Servidores: ${stats.servers}\n👥 Usuários: ${stats.users.toLocaleString()}`);
    }

    if (message.content === '!botgate') {
        try {
            const botInfo = await reporter.getBotInfo();
            message.reply(`🤖 **Informações no BotGate**\n📛 Nome: ${botInfo.name}\n⭐ Votos: ${botInfo.total_votes}\n⭐ Rating: ${botInfo.rating}/5`);
        } catch (error) {
            message.reply('❌ Erro ao buscar informações do BotGate');
        }
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Desligando bot...');
    reporter.stop();
    client.destroy();
    process.exit(0);
});

// Login
client.login(process.env.DISCORD_TOKEN);
