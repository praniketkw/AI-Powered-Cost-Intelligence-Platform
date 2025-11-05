import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { DataPipelineService } from './data-pipeline.js';
import { AIAnalysisService } from './ai-analysis.js';

/**
 * Realtime Service
 * Manages WebSocket connections and real-time data streaming
 */

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  organizationId?: string;
  subscriptions: Set<string>;
  lastActivity: Date;
  metadata?: Record<string, any>;
}

export interface RealtimeMessage {
  type: string;
  data: any;
  timestamp: Date;
  clientId?: string;
}

export interface Subscription {
  type: 'cost_updates' | 'anomaly_alerts' | 'insights' | 'job_progress' | 'recommendations';
  filters?: Record<string, any>;
}

export class RealtimeService extends EventEmitter {
  private clients = new Map<string, WebSocketClient>();
  private dataPipelineService: DataPipelineService;
  private aiAnalysisService: AIAnalysisService;
  
  private messageQueue: RealtimeMessage[] = [];
  private readonly maxQueueSize = 1000;
  private readonly clientTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(
    dataPipelineService: DataPipelineService,
    aiAnalysisService: AIAnalysisService
  ) {
    super();
    this.dataPipelineService = dataPipelineService;
    this.aiAnalysisService = aiAnalysisService;
    
    this.setupEventListeners();
    this.startCleanupTimer();
    
    console.log('✅ Realtime Service initialized');
  }

  private setupEventListeners(): void {
    // Listen to data pipeline events
    this.dataPipelineService.on('costDataUpdated', (data) => {
      this.broadcast('cost_data_updated', data, 'cost_updates');
    });

    this.dataPipelineService.on('anomaliesDetected', (data) => {
      this.broadcast('anomalies_detected', data, 'anomaly_alerts');
    });

    this.dataPipelineService.on('insightsGenerated', (data) => {
      this.broadcast('insights_generated', data, 'insights');
    });

    this.dataPipelineService.on('recommendationsUpdated', (data) => {
      this.broadcast('recommendations_updated', data, 'recommendations');
    });

    this.dataPipelineService.on('jobStarted', (job) => {
      this.broadcast('job_started', job, 'job_progress');
    });

    this.dataPipelineService.on('jobProgress', (job) => {
      this.broadcast('job_progress', job, 'job_progress');
    });

    this.dataPipelineService.on('jobCompleted', (job) => {
      this.broadcast('job_completed', job, 'job_progress');
    });

    this.dataPipelineService.on('jobFailed', (job) => {
      this.broadcast('job_failed', job, 'job_progress');
    });
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupInactiveClients();
    }, 60000); // Run every minute
  }

  /**
   * Add a new WebSocket client
   */
  addClient(ws: WebSocket, metadata?: Record<string, any>): string {
    const clientId = this.generateClientId();
    
    const client: WebSocketClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      lastActivity: new Date(),
      metadata
    };

    this.clients.set(clientId, client);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      data: {
        clientId,
        serverTime: new Date().toISOString(),
        availableSubscriptions: [
          'cost_updates',
          'anomaly_alerts', 
          'insights',
          'job_progress',
          'recommendations'
        ]
      }
    });

    console.log(`🔌 Client ${clientId} connected. Total clients: ${this.clients.size}`);
    this.emit('clientConnected', client);

    return clientId;
  }

  /**
   * Remove a WebSocket client
   */
  removeClient(ws: WebSocket): void {
    for (const [clientId, client] of this.clients) {
      if (client.ws === ws) {
        this.clients.delete(clientId);
        console.log(`🔌 Client ${clientId} disconnected. Total clients: ${this.clients.size}`);
        this.emit('clientDisconnected', client);
        break;
      }
    }
  }

  /**
   * Handle incoming messages from clients
   */
  async handleClientMessage(ws: WebSocket, message: any): Promise<void> {
    const client = this.findClientByWebSocket(ws);
    if (!client) {
      return;
    }

    client.lastActivity = new Date();

    try {
      switch (message.type) {
        case 'subscribe':
          await this.handleSubscription(client, message.data);
          break;

        case 'unsubscribe':
          await this.handleUnsubscription(client, message.data);
          break;

        case 'query':
          await this.handleQuery(client, message.data);
          break;

        case 'ping':
          this.sendToClient(client.id, { type: 'pong', data: { timestamp: new Date().toISOString() } });
          break;

        default:
          this.sendToClient(client.id, {
            type: 'error',
            data: { message: `Unknown message type: ${message.type}` }
          });
      }
    } catch (error) {
      console.error('Error handling client message:', error);
      this.sendToClient(client.id, {
        type: 'error',
        data: { message: 'Internal server error' }
      });
    }
  }

  private async handleSubscription(client: WebSocketClient, subscriptionData: Subscription): Promise<void> {
    const { type, filters } = subscriptionData;
    
    client.subscriptions.add(type);
    
    this.sendToClient(client.id, {
      type: 'subscription_confirmed',
      data: { subscriptionType: type, filters }
    });

    // Send initial data for the subscription
    await this.sendInitialData(client, type, filters);
    
    console.log(`📡 Client ${client.id} subscribed to ${type}`);
  }

  private async handleUnsubscription(client: WebSocketClient, data: { type: string }): Promise<void> {
    client.subscriptions.delete(data.type);
    
    this.sendToClient(client.id, {
      type: 'unsubscription_confirmed',
      data: { subscriptionType: data.type }
    });
    
    console.log(`📡 Client ${client.id} unsubscribed from ${data.type}`);
  }

  private async handleQuery(client: WebSocketClient, queryData: any): Promise<void> {
    const { query, context } = queryData;
    
    try {
      // Process interactive query through AI service
      const response = await this.aiAnalysisService.processInteractiveQuery(
        query,
        [], // Would need to fetch relevant cost data
        context,
        client.userId,
        client.organizationId
      );

      this.sendToClient(client.id, {
        type: 'query_response',
        data: response
      });
    } catch (error) {
      this.sendToClient(client.id, {
        type: 'query_error',
        data: { message: 'Failed to process query', error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  private async sendInitialData(client: WebSocketClient, subscriptionType: string, filters?: any): Promise<void> {
    try {
      switch (subscriptionType) {
        case 'cost_updates':
          // Send recent cost summary
          const costSummary = await this.getCostSummary(filters);
          this.sendToClient(client.id, {
            type: 'initial_cost_data',
            data: costSummary
          });
          break;

        case 'anomaly_alerts':
          // Send active alerts
          const activeAlerts = await this.getActiveAlerts(filters);
          this.sendToClient(client.id, {
            type: 'initial_alerts',
            data: activeAlerts
          });
          break;

        case 'job_progress':
          // Send active jobs
          const activeJobs = this.dataPipelineService.getActiveJobs();
          this.sendToClient(client.id, {
            type: 'initial_jobs',
            data: activeJobs
          });
          break;

        case 'insights':
          // Send recent insights
          const recentInsights = await this.getRecentInsights(filters);
          this.sendToClient(client.id, {
            type: 'initial_insights',
            data: recentInsights
          });
          break;

        case 'recommendations':
          // Send current recommendations
          const recommendations = await this.getCurrentRecommendations(filters);
          this.sendToClient(client.id, {
            type: 'initial_recommendations',
            data: recommendations
          });
          break;
      }
    } catch (error) {
      console.error(`Error sending initial data for ${subscriptionType}:`, error);
    }
  }

  /**
   * Broadcast message to all subscribed clients
   */
  private broadcast(messageType: string, data: any, subscriptionType?: string): void {
    const message: RealtimeMessage = {
      type: messageType,
      data,
      timestamp: new Date()
    };

    // Add to message queue for debugging
    this.addToMessageQueue(message);

    let sentCount = 0;

    for (const client of this.clients.values()) {
      if (!subscriptionType || client.subscriptions.has(subscriptionType)) {
        if (this.sendToClient(client.id, message)) {
          sentCount++;
        }
      }
    }

    console.log(`📡 Broadcasted ${messageType} to ${sentCount} clients`);
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: any): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
      this.removeClient(client.ws);
      return false;
    }
  }

  private findClientByWebSocket(ws: WebSocket): WebSocketClient | undefined {
    for (const client of this.clients.values()) {
      if (client.ws === ws) {
        return client;
      }
    }
    return undefined;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToMessageQueue(message: RealtimeMessage): void {
    this.messageQueue.push(message);
    
    if (this.messageQueue.length > this.maxQueueSize) {
      this.messageQueue = this.messageQueue.slice(-this.maxQueueSize / 2);
    }
  }

  private cleanupInactiveClients(): void {
    const cutoffTime = Date.now() - this.clientTimeout;
    let removedCount = 0;

    for (const [clientId, client] of this.clients) {
      if (client.lastActivity.getTime() < cutoffTime || client.ws.readyState !== WebSocket.OPEN) {
        this.clients.delete(clientId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} inactive clients`);
    }
  }

  // Helper methods to fetch initial data
  private async getCostSummary(filters?: any): Promise<any> {
    // This would fetch from database service
    return {
      totalCost: 50000,
      monthlyTrend: 'increasing',
      departmentCount: 5,
      lastUpdated: new Date().toISOString()
    };
  }

  private async getActiveAlerts(filters?: any): Promise<any> {
    // This would fetch from database service
    return {
      alerts: [],
      count: 0
    };
  }

  private async getRecentInsights(filters?: any): Promise<any> {
    // This would fetch from database service
    return {
      insights: [
        'Cost increased by 15% this week',
        'Engineering department shows highest growth',
        'Storage costs are trending upward'
      ],
      generatedAt: new Date().toISOString()
    };
  }

  private async getCurrentRecommendations(filters?: any): Promise<any> {
    // This would fetch from database service
    return {
      recommendations: [],
      totalSavings: 0,
      count: 0
    };
  }

  // Public methods
  getConnectedClients(): { count: number; clients: Omit<WebSocketClient, 'ws'>[] } {
    const clients = Array.from(this.clients.values()).map(client => ({
      id: client.id,
      userId: client.userId,
      organizationId: client.organizationId,
      subscriptions: Array.from(client.subscriptions),
      lastActivity: client.lastActivity,
      metadata: client.metadata
    }));

    return {
      count: clients.length,
      clients
    };
  }

  getMessageHistory(limit = 50): RealtimeMessage[] {
    return this.messageQueue
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getStatistics(): {
    connectedClients: number;
    totalMessagesSent: number;
    subscriptionCounts: Record<string, number>;
  } {
    const subscriptionCounts: Record<string, number> = {};
    
    for (const client of this.clients.values()) {
      for (const subscription of client.subscriptions) {
        subscriptionCounts[subscription] = (subscriptionCounts[subscription] || 0) + 1;
      }
    }

    return {
      connectedClients: this.clients.size,
      totalMessagesSent: this.messageQueue.length,
      subscriptionCounts
    };
  }

  // Health check
  isHealthy(): boolean {
    return this.clients.size < 1000; // Prevent too many connections
  }

  // Cleanup
  cleanup(): void {
    console.log('🧹 Cleaning up realtime service...');
    
    // Close all client connections
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    }
    
    this.clients.clear();
    this.messageQueue = [];
    
    console.log('✅ Realtime service cleanup completed');
  }
}