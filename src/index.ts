import { Client } from 'discord.js';
import axios, { AxiosInstance } from 'axios';

export interface BotGateConfig {
    botId: string;
    apiKey: string;
    apiUrl?: string;
    updateInterval?: number;
    debug?: boolean;
}

export interface BotStats {
    botId: string;
    serverCount: number;
    userCount: number;
    shardCount: number;
    timestamp: number;
}

export interface BotGateResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export class BotGateReporter {
    private client: Client | null = null;
    private config: Required<BotGateConfig>;
    private axios: AxiosInstance;
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;

    constructor(config: BotGateConfig) {
        // Validar configuração
        if (!config.botId) {
            throw new Error('botId is required');
        }
        if (!config.apiKey) {
            throw new Error('apiKey is required');
        }

        // Configuração padrão
        this.config = {
            botId: config.botId,
            apiKey: config.apiKey,
            apiUrl: config.apiUrl || 'https://api.botgate.com',
            updateInterval: config.updateInterval || 30 * 60 * 1000, // 30 minutos
            debug: config.debug || false
        };

        // Configurar axios
        this.axios = axios.create({
            baseURL: this.config.apiUrl,
            timeout: 10000,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': `BotGate-Stats-Reporter/1.0.0`
            }
        });

        this.log('BotGate Reporter initialized');
    }

    /**
     * Inicia o reporter com um client do Discord.js
     */
    public start(client: Client): void {
        if (this.isRunning) {
            this.log('Reporter already running');
            return;
        }

        this.client = client;
        this.isRunning = true;

        // Aguardar o bot estar pronto
        if (client.isReady()) {
            this.onReady();
        } else {
            client.once('ready', () => this.onReady());
        }

        this.log('Reporter started');
    }

    /**
     * Para o reporter
     */
    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        this.log('Reporter stopped');
    }

    /**
     * Envia estatísticas manualmente
     */
    public async sendStats(): Promise<BotGateResponse> {
        if (!this.client || !this.client.isReady()) {
            throw new Error('Discord client is not ready');
        }

        const stats = this.collectStats();
        return await this.postStats(stats);
    }

    /**
     * Verifica se a API key é válida
     */
    public async verifyApiKey(): Promise<boolean> {
        try {
            const response = await this.axios.get('/api/v1/verify');
            return response.data.success === true;
        } catch (error) {
            this.log('API key verification failed', error);
            return false;
        }
    }

    /**
     * Obtém informações do bot no BotGate
     */
    public async getBotInfo(): Promise<any> {
        try {
            const response = await this.axios.get(`/api/v1/bots/${this.config.botId}`);
            return response.data;
        } catch (error) {
            this.log('Failed to get bot info', error);
            throw error;
        }
    }

    /**
     * Callback quando o bot está pronto
     */
    private onReady(): void {
        this.log(`Bot ready: ${this.client?.user?.tag}`);

        // Enviar stats imediatamente
        this.sendStats()
            .then(() => this.log('Initial stats sent'))
            .catch(error => this.log('Failed to send initial stats', error));

        // Configurar intervalo de atualização
        this.intervalId = setInterval(() => {
            this.sendStats()
                .then(() => this.log('Stats updated'))
                .catch(error => this.log('Failed to update stats', error));
        }, this.config.updateInterval);

        this.log(`Auto-update enabled (every ${this.config.updateInterval / 1000 / 60} minutes)`);
    }

    /**
     * Coleta estatísticas do bot
     */
    private collectStats(): BotStats {
        if (!this.client || !this.client.isReady()) {
            throw new Error('Discord client is not ready');
        }

        const guilds = this.client.guilds.cache;
        const serverCount = guilds.size;

        // Calcular total de usuários (aproximado)
        const userCount = guilds.reduce((acc, guild) => {
            return acc + guild.memberCount;
        }, 0);

        // Número de shards
        const shardCount = this.client.shard ? this.client.shard.count : 1;

        return {
            botId: this.config.botId,
            serverCount,
            userCount,
            shardCount,
            timestamp: Date.now()
        };
    }

    /**
     * Envia estatísticas para a API
     */
    private async postStats(stats: BotStats): Promise<BotGateResponse> {
        try {
            const response = await this.axios.post('/api/v1/bots/stats', stats);

            this.log(`Stats sent successfully: ${stats.serverCount} servers, ${stats.userCount} users`);

            return {
                success: true,
                data: response.data
            };
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message;
            this.log(`Failed to send stats: ${errorMessage}`, error);

            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * Logger interno
     */
    private log(message: string, error?: any): void {
        if (!this.config.debug) return;

        const timestamp = new Date().toISOString();
        console.log(`[BotGate Reporter] [${timestamp}] ${message}`);

        if (error) {
            console.error(error);
        }
    }

    /**
     * Obtém a configuração atual
     */
    public getConfig(): Readonly<Required<BotGateConfig>> {
        return { ...this.config };
    }

    /**
     * Verifica se o reporter está rodando
     */
    public isActive(): boolean {
        return this.isRunning;
    }
}

/**
 * Factory function para criar uma instância do reporter
 */
export function createReporter(config: BotGateConfig): BotGateReporter {
    return new BotGateReporter(config);
}

/**
 * Exportações padrão
 */
export default BotGateReporter;
