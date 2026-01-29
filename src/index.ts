import { Client } from "discord.js";
import axios, { AxiosInstance } from "axios";
import EventEmitter from "events";
import { createServer, Server } from "http";

/**
 * ============================================================================
 * BotGate Stats Reporter
 * ============================================================================
 *
 * Pacote oficial do BotGate para reportar estatísticas do seu bot Discord
 * automaticamente para a plataforma BotGate.
 *
 * @package @botgate/stats-reporter
 * @version 1.1.0
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

  /** Ativar logs detalhados (opcional, padrão: false) */
  debug?: boolean;

  /** Ativar servidor de webhooks interno (opcional, padrão: false) */
  enableWebhooks?: boolean;

  /** Porta para ouvir webhooks (opcional, padrão: 8080). Apenas usado se enableWebhooks for true. */
  webhookPort?: number;

  /** Tentar configurar o webhook automaticamente no site do BotGate (descobre IP e envia para a API) */
  autoConfig?: boolean;

  /** URL da API do BotGate (opcional, usado para testes) */
  apiUrl?: string;
}

/**
 * Configuração interna completa
 * @private
 */
interface InternalConfig {
  botId: string;
  apiKey: string;
  apiUrl: string;
  updateInterval: number;
  debug: boolean;
  retryAttempts: number;
  retryDelay: number;
  webhookPort?: number;
}

/**
 * Estatísticas do bot
 */
export interface BotStats {
  botId: string;
  serverCount: number;
  userCount: number;
  shardCount: number;
  timestamp: number;
}

/**
 * Resposta padrão da API do BotGate
 */
export interface BotGateResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Classe principal do BotGate Reporter
 */
export class BotGateReporter extends EventEmitter {
  private client: Client | null = null;
  private config: InternalConfig;
  private axios: AxiosInstance;
  private statsIntervalId: NodeJS.Timeout | null = null;
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  private webhookServer: Server | null = null;
  private isRunning: boolean = false;
  private failedAttempts: number = 0;
  private currentTier: string = "free";

  /**
   * Cria uma nova instância do BotGate Reporter
   *
   * @param config - Configuração do reporter
   */
  constructor(config: BotGateConfig) {
    super();

    if (!config.botId) throw new Error("[BotGate Reporter] botId is required");
    if (!config.apiKey)
      throw new Error("[BotGate Reporter] apiKey is required");

    this.config = {
      botId: config.botId,
      apiKey: config.apiKey,
      apiUrl:
        config.apiUrl || "https://botgate-api-987684559046.us-central1.run.app",
      updateInterval: 30 * 60 * 1000, // Padrão: 30 minutos (será atualizado via tier)
      debug: config.debug || false,
      retryAttempts: 3,
      retryDelay: 5000,
      webhookPort: config.webhookPort || 8080,
    };

    this.axios = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": `BotGate-Stats-Reporter/1.2.0 (Bot: ${this.config.botId})`,
      },
    });

    if (config.enableWebhooks) {
      this.initWebhookServer();
    }

    if (config.autoConfig) {
      this.setupAutoWebhook();
    }

    this.log("✅ BotGate Reporter initialized", { botId: this.config.botId });
  }

  /**
   * Inicializa o servidor de webhooks interno
   */
  private initWebhookServer(): void {
    if (this.webhookServer) return;

    this.webhookServer = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/webhook") {
        let body = "";
        req.on("data", (chunk) => (body += chunk.toString()));
        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            this.emit("vote", data.details || data);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.writeHead(400);
            res.end();
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.webhookServer.listen(this.config.webhookPort, () => {
      this.log(
        `📡 Webhook server listening on port ${this.config.webhookPort}`,
      );
    });
  }

  /**
   * Configura automaticamente o webhook no painel do BotGate
   */
  public async setupAutoWebhook(): Promise<void> {
    try {
      this.log("🔍 Starting auto-configuration...");

      let webhookUrl = "";
      let protocol = "http";

      // 1. DETECTAR AMBIENTE E CONSTRUIR URL APROPRIADA

      // CASO A: Google Cloud Run
      if (process.env.K_SERVICE) {
        try {
          const service = process.env.K_SERVICE;

          // Obter Project NUMBER do Metadata Server (necessário para a URL do Cloud Run)
          const metadataResponse = await axios.get(
            "http://metadata.google.internal/computeMetadata/v1/project/numeric-project-id",
            {
              headers: { "Metadata-Flavor": "Google" },
              timeout: 2000,
            },
          );

          const projectNumber = metadataResponse.data;
          const region = process.env.GOOGLE_CLOUD_REGION || "us-central1";

          webhookUrl = `https://${service}-${projectNumber}.${region}.run.app/webhook`;
          protocol = "https";
          this.log(
            `☁️ Detected Google Cloud Run environment (Project: ${projectNumber})`,
          );
        } catch (metadataError) {
          this.log(
            "⚠️ Cloud Run detected but failed to get project ID from metadata server",
          );
          throw new Error("Failed to auto-configure Cloud Run webhook");
        }
      }
      // CASO B: Localhost (Desenvolvimento)
      else if (
        this.config.apiUrl?.includes("localhost") ||
        this.config.apiUrl?.includes("127.0.0.1")
      ) {
        webhookUrl = `http://localhost:${this.config.webhookPort}/webhook`;
        this.log(`🏠 Detected localhost environment`);
      }
      // CASO C: Outros ambientes (Railway, Heroku, VPS)
      else {
        const ipResponse = await axios.get("https://api.ipify.org?format=json");
        const publicIp = ipResponse.data.ip;
        webhookUrl = `http://${publicIp}:${this.config.webhookPort}/webhook`;
        this.log(`🌐 Detected public IP: ${publicIp}`);
      }

      if (!webhookUrl) throw new Error("Could not determine webhook URL");

      this.log(`🌐 Auto-Config: Webhook URL set to ${webhookUrl}`);

      // 2. Gerar Secret Aleatório
      const secret = Math.random().toString(36).substring(2, 15);

      // 3. Enviar para a API do BotGate
      const response = await this.axios.post("/api/v1/settings/webhook", {
        url: webhookUrl,
        secret: secret,
        isReporter: true, // Avisar para configurar a coluna reporter_url
      });

      if (response.data.success) {
        this.log("✅ Webhook auto-configured successfully on BotGate");
      }
    } catch (error: any) {
      this.log(
        "❌ Auto-configuration failed",
        error.response?.data || error.message,
      );
    }
  }

  /**
   * Método útil para lidar com mensagens de Shards (IPC)
   * Facilita a vida dos desenvolvedores que usam ShardingManager
   */
  public handleShardMessage(message: any): void {
    if (message && message.type === "BOTGATE_VOTE") {
      this.emit("vote", message.data);
    }
  }

  /**
   * Inicia o reporter e o monitoramento automático
   *
   * @param client - Instância do Discord.js Client
   */
  public start(client: Client): void {
    if (this.isRunning) return;

    this.client = client;
    this.isRunning = true;

    if (client.isReady()) {
      this.onReady();
    } else {
      client.once("ready", () => this.onReady());
    }

    this.log("🚀 Reporter started");
  }

  /**
   * Para o reporter e cancela todos os agendamentos
   */
  public stop(): void {
    if (this.statsIntervalId) clearInterval(this.statsIntervalId);
    if (this.heartbeatIntervalId) clearInterval(this.heartbeatIntervalId);

    this.statsIntervalId = null;
    this.heartbeatIntervalId = null;
    this.isRunning = false;

    this.log("🛑 Reporter stopped");
  }

  /**
   * Envia estatísticas de servidores e usuários
   */
  public async sendStats(): Promise<BotGateResponse> {
    if (!this.client?.isReady()) {
      throw new Error("[BotGate Reporter] Discord client is not ready");
    }

    const stats = await this.collectStats();

    return await this.postWithRetry("/api/v1/bots/stats", stats);
  }

  /**
   * Envia sinal de vida (Heartbeat) - Apenas Business
   */
  public async sendHeartbeat(): Promise<BotGateResponse> {
    return await this.postWithRetry("/api/v1/heartbeat", {});
  }

  /**
   * Verifica se a API key é válida e atualiza configurações de tier
   */
  public async verifyApiKey(): Promise<boolean> {
    try {
      const response = await this.axios.get("/api/v1/verify");

      if (response.data.success && response.data.data?.tier) {
        this.syncFromResponse(response.data.data);
      }

      return response.data.success === true;
    } catch (error) {
      this.log("❌ API key verification failed", this.formatError(error));

      return false;
    }
  }

  /**
   * Busca informações completas do bot
   */
  public async getBotInfo(
    botId: string = this.config.botId,
  ): Promise<BotGateResponse> {
    const response = await this.axios.get(`/api/v1/bots/${botId}`);

    if (response.data.success) {
      this.syncFromResponse(response.data.data);
    }

    return response.data;
  }

  /**
   * Busca detalhes de votos do bot
   */
  public async getBotVotes(
    botId: string = this.config.botId,
    limit: number = 10,
  ): Promise<BotGateResponse> {
    const response = await this.axios.get(`/api/v1/bots/${botId}/votes`, {
      params: { limit },
    });

    return response.data;
  }

  /**
   * Busca métricas e analytics (Requer plano compatível)
   */
  public async getBotAnalytics(
    botId: string = this.config.botId,
  ): Promise<BotGateResponse> {
    const response = await this.axios.get(`/api/v1/bots/${botId}/analytics`);

    return response.data;
  }

  /**
   * Busca histórico de crescimento (Para gráficos)
   */
  public async getStatsHistory(
    botId: string = this.config.botId,
    period: "daily" | "weekly" | "monthly" | "all" = "all",
  ): Promise<BotGateResponse> {
    const response = await this.axios.get(
      `/api/v1/bots/${botId}/stats/history`,
      { params: { period } },
    );

    return response.data;
  }

  /**
   * Busca informações de uso da API (limites e consumo)
   */
  public async getApiUsage(): Promise<BotGateResponse> {
    const response = await this.axios.get("/api/v1/usage");

    if (response.data.success) {
      this.syncFromResponse(response.data.data);
    }

    return response.data;
  }

  /**
   * Métodos Privados
   */

  private async onReady(): Promise<void> {
    this.log(`🤖 Bot ready: ${this.client?.user?.tag}`);

    // Apenas o Shard 0 (líder) ou bot sem shards inicia o loop de postagem
    // Isso evita que cada shard envie requisições duplicadas para a API
    const isLeader = !this.client?.shard || this.client.shard.ids[0] === 0;

    if (isLeader) {
      this.log("⭐ Shard Leader detected. Handling global reporting.");
      await this.verifyApiKey();
      await this.sendStats();
    } else {
      this.log(
        `ℹ️ Shard #${this.client?.shard?.ids[0]} initialized. Skipping reporting (Leader task).`,
      );
    }
  }

  private setupAutoUpdate(): void {
    if (this.statsIntervalId) clearInterval(this.statsIntervalId);

    this.statsIntervalId = setInterval(
      () => this.sendStats(),
      this.config.updateInterval,
    );

    this.log(
      `⏰ Auto-stats enabled (${this.config.updateInterval / 60000} min)`,
    );
  }

  private manageHeartbeat(): void {
    if (this.currentTier === "business") {
      if (this.heartbeatIntervalId) return;

      this.sendHeartbeat(); // Primeiro envio imediato

      this.heartbeatIntervalId = setInterval(
        () => this.sendHeartbeat(),
        5 * 60 * 1000,
      ); // A cada 5 min

      this.log("💓 Business Heartbeat enabled (every 5 min)");
    } else if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);

      this.heartbeatIntervalId = null;
    }
  }

  private async collectStats(): Promise<BotStats> {
    if (!this.client) throw new Error("Client not initialized");

    // Caso NÃO tenha shards, faz a coleta local normal
    if (!this.client.shard) {
      const guilds = this.client.guilds.cache;

      return {
        botId: this.config.botId,
        serverCount: guilds.size,
        userCount: guilds.reduce((acc, g) => acc + (g.memberCount || 0), 0),
        shardCount: 1,
        timestamp: Date.now(),
      };
    }

    // Caso TENHA shards, solicita que todos os shards enviem seus dados e soma
    this.log("📡 Collecting stats from all shards via broadcastEval...");
    const results = (await this.client.shard.broadcastEval((c: any) => {
      return {
        guilds: c.guilds.cache.size,
        users: c.guilds.cache.reduce(
          (acc: number, g: any) => acc + (g.memberCount || 0),
          0,
        ),
      };
    })) as Array<{ guilds: number; users: number }>;

    const totalGuilds = results.reduce((acc, res) => acc + res.guilds, 0);
    const totalUsers = results.reduce((acc, res) => acc + res.users, 0);

    return {
      botId: this.config.botId,
      serverCount: totalGuilds,
      userCount: totalUsers,
      shardCount: this.client.shard.count,
      timestamp: Date.now(),
    };
  }

  private async postWithRetry(
    url: string,
    data: any,
    attempt: number = 1,
  ): Promise<BotGateResponse> {
    try {
      const response = await this.axios.post(url, data);
      const responseData = response.data;

      // Sincronização inteligente: Se a resposta contiver dados do tier, atualiza localmente
      if (responseData.success) {
        this.syncFromResponse(responseData.data);
      }

      this.failedAttempts = 0;

      return { success: true, data: responseData };
    } catch (error: any) {
      const status = error.response?.status;

      // Se o erro for 403 (Upgrade/Tier) ou 429 (Frequência)
      if (status === 403 || status === 429) {
        this.log(
          `⚠️ Tier/Frequency limit reached (${status}). Syncing and waiting for next cycle...`,
        );
        await this.verifyApiKey();

        // NÃO tentar novamente (retry) agora, pois vai falhar de novo.
        // Esperamos o próximo intervalo agendado.
        return {
          success: false,
          error: `Rate limited or tier mismatch (${status})`,
        };
      }

      if (attempt < this.config.retryAttempts) {
        await new Promise((r) => setTimeout(r, this.config.retryDelay));
        return this.postWithRetry(url, data, attempt + 1);
      }

      this.failedAttempts++;
      return { success: false, error: error.message };
    }
  }

  private syncFromResponse(data: any): void {
    if (!data) return;

    // Tenta extrair o tier e o intervalo de diferentes formatos de resposta da API
    // Se for a resposta de /bots/stats, o tier vem dentro de data.tier
    // Se for a resposta de /usage, o tier vem direto em data.tier.name
    const tierObject = data.tier || data;
    const tierName = tierObject.name || tierObject.tier || data.tier;

    const intervalMinutes =
      tierObject.updateIntervalMinutes ||
      data.updates?.updateIntervalMinutes ||
      data.capabilities?.updateIntervalMinutes;

    if (tierName && tierName !== this.currentTier) {
      this.log(`🔄 Plan change detected: ${this.currentTier} -> ${tierName}`);
      this.currentTier = tierName;

      if (intervalMinutes) {
        this.updateIntervalFromTier({
          updateInterval: `${intervalMinutes} minutes`,
        });
      }

      this.manageHeartbeat();
    }
  }

  private updateIntervalFromTier(tierData: any): void {
    const minutes = parseInt(
      tierData.updateInterval?.replace(" minutes", "") || "30",
    );
    const newInterval = minutes * 60 * 1000;

    if (this.config.updateInterval !== newInterval) {
      this.config.updateInterval = newInterval;

      // Se já estiver rodando, precisamos reiniciar o timer com o novo tempo
      if (this.isRunning) {
        this.setupAutoUpdate();
      }
    }
  }

  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(
        `[BotGate Reporter] [${new Date().toISOString()}] ${message}`,
      );

      if (data) console.log(JSON.stringify(data, null, 2));
    }
  }

  private formatError(error: any) {
    return {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
    };
  }
}

export default BotGateReporter;
