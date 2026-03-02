import { Client } from "discord.js";
import axios, { AxiosInstance } from "axios";
import EventEmitter from "events";
import { createServer, Server } from "http";

const STRINGS = {
  "pt-BR": {
    initialized: "✅ BotGate Reporter inicializado",
    webhook_listening: (port: number) => `📡 Servidor de webhook ouvindo na porta ${port}`,
    starting_auto_config: "🔍 Iniciando auto-configuração...",
    detected_gcr: (project: string) => `☁️ Ambiente Google Cloud Run detectado (Projeto: ${project})`,
    failed_gcr_metadata: "⚠️ Cloud Run detectado, mas falha ao obter ID do projeto do servidor de metadata",
    detected_localhost: "🏠 Ambiente localhost detectado",
    detected_public_ip: (ip: string) => `🌐 IP público detectado: ${ip}`,
    auto_config_webhook_url: (url: string) => `🌐 Auto-Config: URL do Webhook definida como ${url}`,
    auto_config_success: "✅ Webhook auto-configurado com sucesso no BotGate",
    auto_config_failed: "❌ Auto-configuração falhou",
    collecting_shards: "📡 Coletando estatísticas de todos os shards via broadcastEval...",
    reporter_started: "🚀 Reporter iniciado",
    reporter_stopped: "🛑 Reporter parado",
    api_key_verify_failed: "❌ Falha na verificação da API key",
    bot_ready: (tag: string) => `🤖 Bot pronto: ${tag}`,
    shard_leader_detected: "⭐ Shard Leader detectado. Lidando com reporte global.",
    shard_initialized_skip: (id: number) => `ℹ️ Shard #${id} inicializado. Pulando reporte (Tarefa do Líder).`,
    auto_stats_enabled: (min: number) => `⏰ Auto-stats ativado (cada ${min} min)`,
    heartbeat_enabled: "💓 Business Heartbeat ativado (cada 5 min)",
    plan_change_detected: (old: string, newPlan: string) => `🔄 Mudança de plano detectada: ${old} -> ${newPlan}`,
    limit_reached: (status: number) => `⚠️ Limite de Tier/Frequência atingido (${status}). Sincronizando e aguardando próximo ciclo...`,
    config_mismatch: (local: string, remote: string) => `⚠️ Divergência de ID! Local: ${local} | API: ${remote}. Sincronizando com o ID da API.`,
    error_bot_id: "O botId é obrigatório para o Reporter",
    error_api_key: "A apiKey é obrigatória para o Reporter",
    error_gcr_webhook: "Falha ao auto-configurar o webhook no Cloud Run",
    error_webhook_url: "Não foi possível determinar a URL do webhook",
    error_client_ready: "O cliente do Discord não está pronto",
    error_client_init: "O cliente do Discord não foi inicializado",
    error_rate_limit: (status: number) => `Limite atingido ou incompatibilidade de tier (${status})`,
  },
  "en-US": {
    initialized: "✅ BotGate Reporter initialized",
    webhook_listening: (port: number) => `📡 Webhook server listening on port ${port}`,
    starting_auto_config: "🔍 Starting auto-configuration...",
    detected_gcr: (project: string) => `☁️ Detected Google Cloud Run environment (Project: ${project})`,
    failed_gcr_metadata: "⚠️ Cloud Run detected but failed to get project ID from metadata server",
    detected_localhost: "🏠 Detected localhost environment",
    detected_public_ip: (ip: string) => `🌐 Detected public IP: ${ip}`,
    auto_config_webhook_url: (url: string) => `🌐 Auto-Config: Webhook URL set to ${url}`,
    auto_config_success: "✅ Webhook auto-configured successfully on BotGate",
    auto_config_failed: "❌ Auto-configuration failed",
    collecting_shards: "📡 Collecting stats from all shards via broadcastEval...",
    reporter_started: "🚀 Reporter started",
    reporter_stopped: "🛑 Reporter stopped",
    api_key_verify_failed: "❌ API key verification failed",
    bot_ready: (tag: string) => `🤖 Bot ready: ${tag}`,
    shard_leader_detected: "⭐ Shard Leader detected. Handling global reporting.",
    shard_initialized_skip: (id: number) => `ℹ️ Shard #${id} initialized. Skipping reporting (Leader task).`,
    auto_stats_enabled: (min: number) => `⏰ Auto-stats enabled (${min} min)`,
    heartbeat_enabled: "💓 Business Heartbeat enabled (every 5 min)",
    plan_change_detected: (old: string, newPlan: string) => `🔄 Plan change detected: ${old} -> ${newPlan}`,
    limit_reached: (status: number) => `⚠️ Tier/Frequency limit reached (${status}). Syncing and waiting for next cycle...`,
    config_mismatch: (local: string, remote: string) => `⚠️ Config mismatch! Local ID: ${local} | API ID: ${remote}. Syncing to API ID.`,
    error_bot_id: "botId is required for the Reporter",
    error_api_key: "apiKey is required for the Reporter",
    error_gcr_webhook: "Failed to auto-configure Cloud Run webhook",
    error_webhook_url: "Could not determine webhook URL",
    error_client_ready: "Discord client is not ready",
    error_client_init: "Discord client not initialized",
    error_rate_limit: (status: number) => `Rate limited or tier mismatch (${status})`,
  },
};

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

  /** Idioma das respostas e logs (opcional, padrão: "pt-BR", valores: "pt-BR" | "en-US") */
  lang?: "pt-BR" | "en-US";
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
  lang: "pt-BR" | "en-US";
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
  private currentTier: string = "";

  /**
   * Cria uma nova instância do BotGate Reporter
   *
   * @param config - Configuração do reporter
   */
  constructor(config: BotGateConfig) {
    super();

    const lang = config.lang || "pt-BR";
    const t_init = STRINGS[lang] || STRINGS["pt-BR"];

    if (!config.botId) throw new Error(`[BotGate Reporter] ${t_init.error_bot_id}`);
    if (!config.apiKey) throw new Error(`[BotGate Reporter] ${t_init.error_api_key}`);

    this.config = {
      botId: config.botId,
      apiKey: config.apiKey,
      apiUrl: config.apiUrl || "https://api.botgate.coden8n.shop",
      updateInterval: 30 * 60 * 1000, // Padrão: 30 minutos (será atualizado via tier)
      debug: config.debug || false,
      retryAttempts: 3,
      retryDelay: 5000,
      webhookPort: config.webhookPort || 8080,
      lang: config.lang || "pt-BR",
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

    if (config.autoConfig !== false) {
      this.setupAutoWebhook();
    }

    const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];
    this.log(t.initialized, { botId: this.config.botId });
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
      const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];

      this.log(t.webhook_listening(this.config.webhookPort as number));
    });
  }

  /**
   * Configura automaticamente o webhook no painel do BotGate
   */
  public async setupAutoWebhook(): Promise<void> {
    const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];
    try {
      this.log(t.starting_auto_config);

      let webhookUrl = "";
      let protocol = "http";

      // 1. DETECTAR AMBIENTE E CONSTRUIR URL APROPRIADA

      // CASO A: Google Cloud Run
      if (process.env.K_SERVICE) {
        try {
          const service = process.env.K_SERVICE;

          // Obter Project NUMBER do Metadata Server (necessário para a URL do Cloud Run)
          const metadataResponse = await axios.get("http://metadata.google.internal/computeMetadata/v1/project/numeric-project-id", {
            headers: { "Metadata-Flavor": "Google" },
            timeout: 2000,
          });

          const projectNumber = metadataResponse.data;
          const region = process.env.GOOGLE_CLOUD_REGION || "us-central1";

          webhookUrl = `https://${service}-${projectNumber}.${region}.run.app/webhook`;
          protocol = "https";

          this.log(t.detected_gcr(projectNumber));
        } catch (metadataError) {
          this.log(t.failed_gcr_metadata);

          throw new Error(t.error_gcr_webhook);
        }
      }
      // CASO B: Localhost (Desenvolvimento)
      else if (this.config.apiUrl?.includes("localhost") || this.config.apiUrl?.includes("127.0.0.1")) {
        webhookUrl = `http://localhost:${this.config.webhookPort}/webhook`;

        this.log(t.detected_localhost);
      }
      // CASO C: Outros ambientes (Railway, Heroku, VPS)
      else {
        const ipResponse = await axios.get("https://api.ipify.org?format=json");
        const publicIp = ipResponse.data.ip;

        webhookUrl = `http://${publicIp}:${this.config.webhookPort}/webhook`;

        this.log(t.detected_public_ip(publicIp));
      }

      if (!webhookUrl) throw new Error(t.error_webhook_url);

      this.log(t.auto_config_webhook_url(webhookUrl));

      // 2. Gerar Secret Aleatório
      const secret = Math.random().toString(36).substring(2, 15);

      // 3. Enviar para a API do BotGate
      const response = await this.axios.post("/api/v1/settings/webhook", {
        url: webhookUrl,
        secret: secret,
        isReporter: true, // Avisar para configurar a coluna reporter_url
      });

      if (response.data.success) {
        this.log(t.auto_config_success);
      }
    } catch (error: any) {
      this.log(t.auto_config_failed, error.response?.data || error.message);
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

    const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];
    this.log(t.reporter_started);
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

    const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];

    this.log(t.reporter_stopped);
  }

  /**
   * Envia estatísticas de servidores e usuários
   */
  public async sendStats(): Promise<BotGateResponse> {
    if (!this.client?.isReady()) {
      const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];
      throw new Error(`[BotGate Reporter] ${t.error_client_ready}`);
    }

    const stats = await this.collectStats();

    return await this.postWithRetry("/api/v1/bots/stats", {
      ...stats,
      lang: this.config.lang,
    });
  }

  /**
   * Envia sinal de vida (Heartbeat) - Apenas Business
   */
  public async sendHeartbeat(): Promise<BotGateResponse> {
    return await this.postWithRetry("/api/v1/heartbeat", {
      lang: this.config.lang,
    });
  }

  /**
   * Verifica se a API key é válida e atualiza configurações de tier
   */
  public async verifyApiKey(): Promise<boolean> {
    try {
      const response = await this.axios.get("/api/v1/verify", {
        params: { lang: this.config.lang },
      });

      if (response.data.success && response.data.data?.tier) {
        this.syncFromResponse(response.data.data);
      }

      return response.data.success === true;
    } catch (error) {
      const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];

      this.log(t.api_key_verify_failed, this.formatError(error));

      return false;
    }
  }

  /**
   * Busca informações completas do bot
   */
  public async getBotInfo(botId: string = this.config.botId): Promise<BotGateResponse> {
    const response = await this.axios.get(`/api/v1/bots/${botId}`, {
      params: { lang: this.config.lang },
    });

    if (response.data.success) {
      this.syncFromResponse(response.data.data);
    }

    return response.data;
  }

  /**
   * Busca detalhes de votos do bot
   */
  public async getBotVotes(botId: string = this.config.botId, limit: number = 10): Promise<BotGateResponse> {
    const response = await this.axios.get(`/api/v1/bots/${botId}/votes`, {
      params: { limit, lang: this.config.lang },
    });

    return response.data;
  }

  /**
   * Busca métricas e analytics (Requer plano compatível)
   */
  public async getBotAnalytics(botId: string = this.config.botId): Promise<BotGateResponse> {
    const response = await this.axios.get(`/api/v1/bots/${botId}/analytics`, {
      params: { lang: this.config.lang },
    });

    return response.data;
  }

  /**
   * Busca histórico de crescimento (Para gráficos)
   */
  public async getStatsHistory(botId: string = this.config.botId, period: "daily" | "weekly" | "monthly" | "all" = "all"): Promise<BotGateResponse> {
    const response = await this.axios.get(`/api/v1/bots/${botId}/stats/history`, { params: { period, lang: this.config.lang } });

    return response.data;
  }

  /**
   * Busca informações de uso da API (limites e consumo)
   */
  public async getApiUsage(): Promise<BotGateResponse> {
    const response = await this.axios.get("/api/v1/usage", {
      params: { lang: this.config.lang },
    });

    if (response.data.success) {
      this.syncFromResponse(response.data.data);
    }

    return response.data;
  }

  /**
   * Métodos Privados
   */

  private async onReady(): Promise<void> {
    const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];

    this.log(t.bot_ready(this.client?.user?.tag as string));

    // Apenas o Shard 0 (líder) ou bot sem shards inicia o loop de postagem
    // Isso evita que cada shard envie requisições duplicadas para a API
    const isLeader = !this.client?.shard || this.client.shard.ids[0] === 0;

    if (isLeader) {
      this.log(t.shard_leader_detected);

      await this.verifyApiKey();
      await this.sendStats();

      // Inicia o intervalo de postagem se ainda não estiver rodando
      if (!this.statsIntervalId) {
        this.setupAutoUpdate();
      }
    } else {
      this.log(t.shard_initialized_skip(this.client?.shard?.ids[0] || 0));
    }
  }

  private setupAutoUpdate(): void {
    if (this.statsIntervalId) clearInterval(this.statsIntervalId);

    this.statsIntervalId = setInterval(() => this.sendStats(), this.config.updateInterval);

    const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];

    this.log(t.auto_stats_enabled(this.config.updateInterval / 60000));
  }

  private manageHeartbeat(): void {
    if (this.currentTier === "business") {
      if (this.heartbeatIntervalId) return;

      this.sendHeartbeat(); // Primeiro envio imediato

      this.heartbeatIntervalId = setInterval(() => this.sendHeartbeat(), 5 * 60 * 1000); // A cada 5 min

      const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];

      this.log(t.heartbeat_enabled);
    } else if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);

      this.heartbeatIntervalId = null;
    }
  }

  private async collectStats(): Promise<BotStats> {
    if (!this.client) {
      const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];
      throw new Error(t.error_client_init);
    }

    const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];

    // Caso NÃO tenha shards, faz a coleta local normal
    if (!this.client.shard) {
      const guilds = this.client.guilds.cache;

      return {
        botId: this.config.botId,
        serverCount: guilds.size,
        userCount: guilds.reduce((acc: number, g: any) => acc + (g.memberCount || 0), 0),
        shardCount: 1,
        timestamp: Date.now(),
      };
    }

    // Caso TENHA shards, solicita que todos os shards enviem seus dados e soma
    this.log(t.collecting_shards);
    const results = (await this.client.shard.broadcastEval((c: any) => {
      return {
        guilds: c.guilds.cache.size,
        users: c.guilds.cache.reduce((acc: number, g: any) => acc + (g.memberCount || 0), 0),
      };
    })) as Array<{ guilds: number; users: number }>;

    const totalGuilds = results.reduce((acc: number, res: any) => acc + res.guilds, 0);
    const totalUsers = results.reduce((acc: number, res: any) => acc + res.users, 0);

    return {
      botId: this.config.botId,
      serverCount: totalGuilds,
      userCount: totalUsers,
      shardCount: (this.client.shard as any).count,
      timestamp: Date.now(),
    };
  }

  private async postWithRetry(url: string, data: any, attempt: number = 1): Promise<BotGateResponse> {
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
        const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];

        this.log(t.limit_reached(status as number));

        await this.verifyApiKey();

        // NÃO tentar novamente (retry) agora, pois vai falhar de novo.
        // Esperamos o próximo intervalo agendado.
        return {
          success: false,
          error: t.error_rate_limit(status as number),
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

    // Sincronizar ID do Bot (Integridade)
    // Se o servidor retornar um botId (que é o real vinculado à API Key)
    // e ele for diferente do configurado, nós corrigimos localmente.
    if (data.botId && data.botId !== this.config.botId) {
      if (this.config.debug) {
        const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];
        this.log(t.config_mismatch(this.config.botId, data.botId));
      }

      this.config.botId = data.botId;

      // Atualizar o User-Agent nas requisições futuras
      this.axios.defaults.headers["User-Agent"] = `BotGate-Stats-Reporter/1.2.0 (Bot: ${this.config.botId})`;
    }

    // Tenta extrair o tier e o intervalo de diferentes formatos de resposta da API
    // Se for a resposta de /bots/stats, o tier vem dentro de data.tier
    // Se for a resposta de /usage, o tier vem direto em data.tier.name
    const tierObject = data.tier || data;
    const tierName = tierObject.name || tierObject.tier || data.tier;

    const intervalMinutes = tierObject.updateIntervalMinutes || data.updates?.updateIntervalMinutes || data.capabilities?.updateIntervalMinutes;

    if (tierName && tierName !== this.currentTier) {
      const t = STRINGS[this.config.lang] || STRINGS["pt-BR"];

      this.log(t.plan_change_detected(this.currentTier, tierName));
      this.currentTier = tierName;

      if (intervalMinutes) {
        this.updateIntervalFromTier(intervalMinutes);
      }

      this.manageHeartbeat();
    }
  }

  private updateIntervalFromTier(minutesData: any): void {
    const minutes = typeof minutesData === "number" ? minutesData : parseInt(String(minutesData));
    const newInterval = (isNaN(minutes) ? 30 : minutes) * 60 * 1000;

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
      console.log(`[BotGate Reporter] [${new Date().toISOString()}] ${message}`);

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
