import { Client } from "discord.js";
import axios, { AxiosInstance, AxiosError } from "axios";

/**
 * ============================================================================
 * BotGate Stats Reporter
 * ============================================================================
 *
 * Pacote oficial do BotGate para reportar estatísticas do seu bot Discord
 * automaticamente para a plataforma BotGate.
 *
 * Funcionalidades:
 * - Envio automático de estatísticas (servidores, usuários, shards)
 * - Intervalo configurável de atualização
 * - Verificação de API key
 * - Retry automático em caso de falha
 * - Logs detalhados (modo debug)
 * - TypeScript completo
 *
 * @package @botgate/stats-reporter
 * @version 1.0.0
 * @author BotGate Team
 * @license MIT
 * ============================================================================
 */

/**
 * Configuração do BotGate Reporter
 */
export interface BotGateConfig {
  /** ID do bot no Discord (obrigatório) */
  botId: string;

  /** API key do bot no BotGate (obrigatório) */
  apiKey: string;

  /** URL da API do BotGate (opcional, padrão: https://api.botgate.com) */
  apiUrl?: string;

  /** Intervalo de atualização em milissegundos (opcional, padrão: 30 minutos) */
  updateInterval?: number;

  /** Ativar logs detalhados (opcional, padrão: false) */
  debug?: boolean;

  /** Número de tentativas em caso de falha (opcional, padrão: 3) */
  retryAttempts?: number;

  /** Delay entre tentativas em ms (opcional, padrão: 5000) */
  retryDelay?: number;
}

/**
 * Estatísticas do bot
 */
export interface BotStats {
  /** ID do bot */
  botId: string;

  /** Número de servidores */
  serverCount: number;

  /** Número total de usuários */
  userCount: number;

  /** Número de shards */
  shardCount: number;

  /** Timestamp do envio */
  timestamp: number;
}

/**
 * Resposta da API do BotGate
 */
export interface BotGateResponse {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;

  /** Mensagem de retorno */
  message?: string;

  /** Dados adicionais */
  data?: any;

  /** Erro (se houver) */
  error?: string;
}

/**
 * Informações do bot no BotGate
 */
export interface BotInfo {
  id: string;
  name: string;
  avatar: string | null;
  discriminator: string;
  shortDescription: string;
  tagline: string | null;
  prefix: string;
  verified: boolean;
  premium: boolean;
  certified: boolean;
  status: "pending" | "approved" | "rejected" | "banned";
  stats: {
    servers: number;
    users: number;
    shards: number;
    votes: number;
    monthlyVotes: number;
    rating: number;
    reviews: number;
    lastUpdated: Date | null;
  };
  createdAt: Date;
  approvedAt: Date | null;
}

/**
 * Classe principal do BotGate Reporter
 *
 * @example
 * ```typescript
 * import { Client } from 'discord.js';
 * import { BotGateReporter } from '@botgate/stats-reporter';
 *
 * const client = new Client({ intents: [...] });
 *
 * const reporter = new BotGateReporter({
 *     botId: '123456789012345678',
 *     apiKey: 'your-api-key-here',
 *     updateInterval: 30 * 60 * 1000, // 30 minutos
 *     debug: true
 * });
 *
 * client.once('ready', () => {
 *     reporter.start(client);
 * });
 *
 * client.login('your-bot-token');
 * ```
 */
export class BotGateReporter {
  private client: Client | null = null;
  private config: Required<BotGateConfig>;
  private axios: AxiosInstance;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private failedAttempts: number = 0;

  /**
   * Cria uma nova instância do BotGate Reporter
   *
   * @param config - Configuração do reporter
   * @throws {Error} Se botId ou apiKey não forem fornecidos
   */
  constructor(config: BotGateConfig) {
    // Validar configuração obrigatória
    if (!config.botId) {
      throw new Error("[BotGate Reporter] botId is required");
    }
    if (!config.apiKey) {
      throw new Error("[BotGate Reporter] apiKey is required");
    }

    // Aplicar configuração padrão
    this.config = {
      botId: config.botId,
      apiKey: config.apiKey,
      apiUrl: config.apiUrl || "https://api.botgate.com",
      updateInterval: config.updateInterval || 30 * 60 * 1000, // 30 minutos
      debug: config.debug || false,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 5000,
    };

    // Configurar cliente HTTP
    this.axios = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": `BotGate-Stats-Reporter/1.0.0 (Bot: ${this.config.botId})`,
      },
    });

    this.log("✅ BotGate Reporter initialized", {
      botId: this.config.botId,
      apiUrl: this.config.apiUrl,
      updateInterval: `${this.config.updateInterval / 1000 / 60} minutes`,
    });
  }

  /**
   * Inicia o reporter com um client do Discord.js
   *
   * @param client - Instância do Discord.js Client
   *
   * @example
   * ```typescript
   * client.once('ready', () => {
   *     reporter.start(client);
   * });
   * ```
   */
  public start(client: Client): void {
    if (this.isRunning) {
      this.log("⚠️ Reporter already running");
      return;
    }

    this.client = client;
    this.isRunning = true;

    // Aguardar o bot estar pronto
    if (client.isReady()) {
      this.onReady();
    } else {
      client.once("ready", () => this.onReady());
    }

    this.log("🚀 Reporter started");
  }

  /**
   * Para o reporter e cancela atualizações automáticas
   *
   * @example
   * ```typescript
   * process.on('SIGINT', () => {
   *     reporter.stop();
   *     process.exit(0);
   * });
   * ```
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.log("🛑 Reporter stopped");
  }

  /**
   * Envia estatísticas manualmente (sem aguardar o intervalo)
   *
   * @returns Promise com a resposta da API
   * @throws {Error} Se o client não estiver pronto
   *
   * @example
   * ```typescript
   * try {
   *     const response = await reporter.sendStats();
   *     console.log('Stats enviadas:', response);
   * } catch (error) {
   *     console.error('Erro ao enviar stats:', error);
   * }
   * ```
   */
  public async sendStats(): Promise<BotGateResponse> {
    if (!this.client || !this.client.isReady()) {
      throw new Error("[BotGate Reporter] Discord client is not ready");
    }

    const stats = this.collectStats();
    return await this.postStatsWithRetry(stats);
  }

  /**
   * Verifica se a API key é válida
   *
   * @returns Promise<boolean> - true se a API key for válida
   *
   * @example
   * ```typescript
   * const isValid = await reporter.verifyApiKey();
   * if (isValid) {
   *     console.log('API key válida!');
   * } else {
   *     console.error('API key inválida!');
   * }
   * ```
   */
  public async verifyApiKey(): Promise<boolean> {
    try {
      const response = await this.axios.get("/api/v1/verify");
      this.log("✅ API key verified", response.data);
      return response.data.success === true;
    } catch (error) {
      this.log("❌ API key verification failed", this.formatError(error));
      return false;
    }
  }

  /**
   * Obtém informações do bot no BotGate
   *
   * @returns Promise com as informações do bot
   * @throws {Error} Se o bot não for encontrado ou houver erro na API
   *
   * @example
   * ```typescript
   * try {
   *     const botInfo = await reporter.getBotInfo();
   *     console.log('Bot:', botInfo.name);
   *     console.log('Votos:', botInfo.stats.votes);
   * } catch (error) {
   *     console.error('Erro ao buscar info:', error);
   * }
   * ```
   */
  public async getBotInfo(): Promise<BotInfo> {
    try {
      const response = await this.axios.get(
        `/api/v1/bots/${this.config.botId}`,
      );
      this.log("📊 Bot info retrieved", response.data.data);
      return response.data.data;
    } catch (error) {
      this.log("❌ Failed to get bot info", this.formatError(error));
      throw error;
    }
  }

  /**
   * Callback executado quando o bot está pronto
   * @private
   */
  private onReady(): void {
    this.log(`🤖 Bot ready: ${this.client?.user?.tag}`);

    // Enviar stats imediatamente
    this.sendStats()
      .then((response) => {
        if (response.success) {
          this.log("✅ Initial stats sent successfully");
          this.failedAttempts = 0;
        } else {
          this.log("⚠️ Failed to send initial stats", response);
        }
      })
      .catch((error) => {
        this.log("❌ Error sending initial stats", this.formatError(error));
      });

    // Configurar intervalo de atualização automática
    this.intervalId = setInterval(() => {
      this.sendStats()
        .then((response) => {
          if (response.success) {
            this.log("✅ Stats updated successfully");
            this.failedAttempts = 0;
          } else {
            this.log("⚠️ Failed to update stats", response);
          }
        })
        .catch((error) => {
          this.log("❌ Error updating stats", this.formatError(error));
        });
    }, this.config.updateInterval);

    this.log(
      `⏰ Auto-update enabled (every ${this.config.updateInterval / 1000 / 60} minutes)`,
    );
  }

  /**
   * Coleta estatísticas atuais do bot
   * @private
   */
  private collectStats(): BotStats {
    if (!this.client || !this.client.isReady()) {
      throw new Error("[BotGate Reporter] Discord client is not ready");
    }

    const guilds = this.client.guilds.cache;
    const serverCount = guilds.size;

    // Calcular total de usuários (soma de memberCount de todos os servidores)
    const userCount = guilds.reduce((acc, guild) => {
      return acc + guild.memberCount;
    }, 0);

    // Número de shards (1 se não estiver usando sharding)
    const shardCount = this.client.shard ? this.client.shard.count : 1;

    return {
      botId: this.config.botId,
      serverCount,
      userCount,
      shardCount,
      timestamp: Date.now(),
    };
  }

  /**
   * Envia estatísticas para a API com retry automático
   * @private
   */
  private async postStatsWithRetry(
    stats: BotStats,
    attempt: number = 1,
  ): Promise<BotGateResponse> {
    try {
      const response = await this.axios.post("/api/v1/bots/stats", stats);

      this.log(`📤 Stats sent successfully (attempt ${attempt})`, {
        servers: stats.serverCount,
        users: stats.userCount,
        shards: stats.shardCount,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      const errorMessage = this.formatError(error);

      // Se ainda temos tentativas restantes, tentar novamente
      if (attempt < this.config.retryAttempts) {
        this.log(
          `⚠️ Failed to send stats (attempt ${attempt}/${this.config.retryAttempts}), retrying in ${this.config.retryDelay / 1000}s...`,
          errorMessage,
        );

        // Aguardar antes de tentar novamente
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.retryDelay),
        );

        return this.postStatsWithRetry(stats, attempt + 1);
      }

      // Todas as tentativas falharam
      this.failedAttempts++;
      this.log(
        `❌ Failed to send stats after ${this.config.retryAttempts} attempts`,
        errorMessage,
      );

      return {
        success: false,
        message: errorMessage.message,
        error: errorMessage.error,
      };
    }
  }

  /**
   * Formata erros do axios para exibição
   * @private
   */
  private formatError(error: any): {
    message: string;
    error: string;
    status?: number;
  } {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const responseData = axiosError.response?.data as any;

      return {
        message: responseData?.message || axiosError.message,
        error: responseData?.error || axiosError.code || "Unknown error",
        status: axiosError.response?.status,
      };
    }

    return {
      message: error?.message || "Unknown error",
      error: error?.toString() || "Unknown error",
    };
  }

  /**
   * Logger interno com suporte a debug
   * @private
   */
  private log(message: string, data?: any): void {
    if (!this.config.debug) return;

    const timestamp = new Date().toISOString();
    console.log(`[BotGate Reporter] [${timestamp}] ${message}`);

    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Obtém a configuração atual (somente leitura)
   *
   * @returns Configuração atual do reporter
   */
  public getConfig(): Readonly<Required<BotGateConfig>> {
    return { ...this.config };
  }

  /**
   * Verifica se o reporter está ativo
   *
   * @returns true se o reporter estiver rodando
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Obtém o número de tentativas falhadas consecutivas
   *
   * @returns Número de falhas consecutivas
   */
  public getFailedAttempts(): number {
    return this.failedAttempts;
  }
}

/**
 * Factory function para criar uma instância do reporter
 *
 * @param config - Configuração do reporter
 * @returns Nova instância do BotGateReporter
 *
 * @example
 * ```typescript
 * const reporter = createReporter({
 *     botId: '123456789012345678',
 *     apiKey: 'your-api-key-here'
 * });
 * ```
 */
export function createReporter(config: BotGateConfig): BotGateReporter {
  return new BotGateReporter(config);
}

/**
 * Exportação padrão
 */
export default BotGateReporter;
