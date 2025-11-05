import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

/**
 * MCP Integration Service
 * Manages communication with MCP servers for cost data and analysis
 */

export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  process?: ChildProcess;
  status: 'stopped' | 'starting' | 'running' | 'error';
  lastError?: string;
  startedAt?: Date;
}

export interface MCPToolCall {
  server: string;
  tool: string;
  arguments: Record<string, any>;
  timeout?: number;
}

export interface MCPToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

export class MCPIntegrationService extends EventEmitter {
  private servers = new Map<string, MCPServer>();
  private isInitialized = false;

  constructor() {
    super();
    this.initializeDefaultServers();
  }

  private initializeDefaultServers() {
    // Azure Cost MCP Server
    this.servers.set('azure-cost', {
      name: 'azure-cost',
      command: 'npm',
      args: ['run', 'start', '--workspace=mcp-servers/azure-cost-mcp'],
      env: {
        ...process.env,
        NODE_ENV: 'production'
      },
      status: 'stopped'
    });

    // Add more MCP servers as needed
    console.log('✅ MCP servers configured');
  }

  async initialize(): Promise<void> {
    try {
      // Start all configured servers
      for (const [name, server] of this.servers) {
        await this.startServer(name);
      }
      
      this.isInitialized = true;
      console.log('✅ MCP Integration Service initialized');
    } catch (error) {
      console.error('❌ MCP Integration Service initialization failed:', error);
      throw error;
    }
  }

  async startServer(serverName: string): Promise<boolean> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`Server ${serverName} not found`);
    }

    if (server.status === 'running') {
      return true;
    }

    try {
      server.status = 'starting';
      console.log(`🚀 Starting MCP server: ${serverName}`);

      const process = spawn(server.command, server.args, {
        env: server.env,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      server.process = process;
      server.startedAt = new Date();

      // Handle process events
      process.on('spawn', () => {
        server.status = 'running';
        console.log(`✅ MCP server ${serverName} started successfully`);
        this.emit('serverStarted', serverName);
      });

      process.on('error', (error) => {
        server.status = 'error';
        server.lastError = error.message;
        console.error(`❌ MCP server ${serverName} error:`, error);
        this.emit('serverError', serverName, error);
      });

      process.on('exit', (code, signal) => {
        server.status = 'stopped';
        console.log(`🛑 MCP server ${serverName} exited with code ${code}, signal ${signal}`);
        this.emit('serverStopped', serverName, code, signal);
      });

      // Capture stdout/stderr for debugging
      process.stdout?.on('data', (data) => {
        console.log(`[${serverName}] ${data.toString().trim()}`);
      });

      process.stderr?.on('data', (data) => {
        console.error(`[${serverName}] ${data.toString().trim()}`);
      });

      // Wait a moment to ensure the process started
      await new Promise(resolve => setTimeout(resolve, 2000));

      return server.status === 'running';
    } catch (error) {
      server.status = 'error';
      server.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to start MCP server ${serverName}:`, error);
      return false;
    }
  }

  async stopServer(serverName: string): Promise<boolean> {
    const server = this.servers.get(serverName);
    if (!server || !server.process) {
      return true;
    }

    try {
      console.log(`🛑 Stopping MCP server: ${serverName}`);
      
      server.process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Force kill if still running
      if (server.status === 'running') {
        server.process.kill('SIGKILL');
      }

      server.status = 'stopped';
      server.process = undefined;
      
      console.log(`✅ MCP server ${serverName} stopped`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to stop MCP server ${serverName}:`, error);
      return false;
    }
  }

  async restartServer(serverName: string): Promise<boolean> {
    await this.stopServer(serverName);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.startServer(serverName);
  }

  // Tool execution methods
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResponse> {
    const startTime = Date.now();
    const server = this.servers.get(toolCall.server);

    if (!server) {
      return {
        success: false,
        error: `Server ${toolCall.server} not found`,
        executionTime: Date.now() - startTime
      };
    }

    if (server.status !== 'running') {
      return {
        success: false,
        error: `Server ${toolCall.server} is not running (status: ${server.status})`,
        executionTime: Date.now() - startTime
      };
    }

    try {
      // For now, we'll simulate MCP tool calls
      // In a real implementation, this would use the MCP protocol
      const result = await this.simulateToolCall(toolCall);
      
      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  // Azure Cost Management specific methods
  async getCostData(params: {
    startDate: string;
    endDate: string;
    subscriptionId?: string;
    department?: string;
    resourceType?: string;
  }): Promise<MCPToolResponse> {
    return this.callTool({
      server: 'azure-cost',
      tool: 'get_cost_data',
      arguments: params
    });
  }

  async getCostAnomalies(params: {
    days?: number;
    threshold?: number;
  }): Promise<MCPToolResponse> {
    return this.callTool({
      server: 'azure-cost',
      tool: 'get_cost_anomalies',
      arguments: params
    });
  }

  async getOptimizationRecommendations(params: {
    department?: string;
    minSavings?: number;
  }): Promise<MCPToolResponse> {
    return this.callTool({
      server: 'azure-cost',
      tool: 'get_optimization_recommendations',
      arguments: params
    });
  }

  async getUsageTrends(params: {
    resourceType?: string;
    period?: 'daily' | 'weekly' | 'monthly';
    days?: number;
  }): Promise<MCPToolResponse> {
    return this.callTool({
      server: 'azure-cost',
      tool: 'get_usage_trends',
      arguments: params
    });
  }

  async getDepartmentBreakdown(params: {
    month?: string;
  }): Promise<MCPToolResponse> {
    return this.callTool({
      server: 'azure-cost',
      tool: 'get_department_breakdown',
      arguments: params
    });
  }

  async getResourceRightsizing(params: {
    utilizationThreshold?: number;
  }): Promise<MCPToolResponse> {
    return this.callTool({
      server: 'azure-cost',
      tool: 'get_resource_rightsizing',
      arguments: params
    });
  }

  // Batch operations
  async executeBatch(toolCalls: MCPToolCall[]): Promise<MCPToolResponse[]> {
    const promises = toolCalls.map(call => this.callTool(call));
    return Promise.all(promises);
  }

  // Server management
  getServerStatus(serverName?: string): MCPServer | MCPServer[] {
    if (serverName) {
      const server = this.servers.get(serverName);
      if (!server) {
        throw new Error(`Server ${serverName} not found`);
      }
      return { ...server, process: undefined }; // Don't expose process object
    }

    return Array.from(this.servers.values()).map(server => ({
      ...server,
      process: undefined
    }));
  }

  getServerHealth(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    
    for (const [name, server] of this.servers) {
      health[name] = server.status === 'running';
    }
    
    return health;
  }

  // Private helper methods
  private async simulateToolCall(toolCall: MCPToolCall): Promise<any> {
    // This simulates the MCP tool call
    // In a real implementation, this would send JSON-RPC messages to the MCP server
    
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));

    switch (toolCall.tool) {
      case 'get_cost_data':
        return this.generateMockCostData(toolCall.arguments);
      
      case 'get_cost_anomalies':
        return this.generateMockAnomalies(toolCall.arguments);
      
      case 'get_optimization_recommendations':
        return this.generateMockRecommendations(toolCall.arguments);
      
      case 'get_usage_trends':
        return this.generateMockTrends(toolCall.arguments);
      
      case 'get_department_breakdown':
        return this.generateMockDepartmentBreakdown(toolCall.arguments);
      
      case 'get_resource_rightsizing':
        return this.generateMockRightsizing(toolCall.arguments);
      
      default:
        throw new Error(`Unknown tool: ${toolCall.tool}`);
    }
  }

  private generateMockCostData(params: any): any {
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const data = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      data.push({
        id: `cost-${date.toISOString().split('T')[0]}-${Math.random().toString(36).substr(2, 9)}`,
        date: date.toISOString().split('T')[0],
        cost: Math.random() * 1000 + 100,
        currency: 'USD',
        resourceGroup: params.department ? `rg-${params.department}` : 'rg-engineering',
        serviceName: params.resourceType || 'Virtual Machines',
        resourceType: 'Microsoft.Compute/virtualMachines',
        department: params.department || 'engineering',
        subscriptionId: params.subscriptionId || 'sub-12345',
        tags: { environment: 'production', team: 'backend' },
        metadata: { region: 'eastus', size: 'Standard_D2s_v3' }
      });
    }

    return {
      data,
      summary: {
        totalCost: data.reduce((sum, item) => sum + item.cost, 0),
        recordCount: data.length,
        dateRange: { start: params.startDate, end: params.endDate }
      },
      source: 'mcp-server'
    };
  }

  private generateMockAnomalies(params: any): any {
    return {
      anomalies: [
        {
          date: new Date().toISOString().split('T')[0],
          cost: 2500,
          expectedCost: 800,
          deviation: 1700,
          zScore: 3.2,
          severity: 'high',
          type: 'spike'
        }
      ],
      summary: {
        totalAnomalies: 1,
        analysisPeriod: params.days || 30,
        threshold: params.threshold || 2.0
      }
    };
  }

  private generateMockRecommendations(params: any): any {
    return {
      recommendations: [
        {
          type: 'rightsizing',
          title: 'Rightsize Virtual Machines',
          description: 'Several VMs are over-provisioned and can be downsized',
          monthlySavings: 1200,
          currentMonthlyCost: 4800,
          effort: 'medium',
          risk: 'low',
          actions: ['Analyze utilization', 'Downsize VMs', 'Monitor performance']
        }
      ],
      summary: {
        totalPotentialSavings: 1200,
        recommendationCount: 1
      }
    };
  }

  private generateMockTrends(params: any): any {
    return {
      trends: [
        { period: '2024-01-01', totalCost: 5000, resourceCount: 50 },
        { period: '2024-01-02', totalCost: 5200, resourceCount: 52 },
        { period: '2024-01-03', totalCost: 4800, resourceCount: 48 }
      ],
      summary: {
        period: params.period || 'daily',
        overallTrend: 'stable'
      }
    };
  }

  private generateMockDepartmentBreakdown(params: any): any {
    return {
      breakdown: {
        engineering: { totalCost: 15000, resourceCount: 150, services: ['Virtual Machines', 'Storage'] },
        marketing: { totalCost: 8000, resourceCount: 80, services: ['App Service', 'CDN'] },
        sales: { totalCost: 5000, resourceCount: 50, services: ['SQL Database', 'Logic Apps'] }
      },
      summary: {
        month: params.month || new Date().toISOString().slice(0, 7),
        totalCost: 28000,
        departmentCount: 3
      }
    };
  }

  private generateMockRightsizing(params: any): any {
    return {
      opportunities: [
        {
          resourceId: 'vm-web-01',
          resourceType: 'Virtual Machines',
          currentMonthlyCost: 500,
          currentUtilization: 15,
          recommendedAction: 'Downsize to smaller VM',
          monthlySavings: 200,
          confidence: 'high'
        }
      ],
      summary: {
        totalOpportunities: 1,
        potentialMonthlySavings: 200
      }
    };
  }

  // Health check
  isHealthy(): boolean {
    if (!this.isInitialized) return false;
    
    const runningServers = Array.from(this.servers.values())
      .filter(server => server.status === 'running');
    
    return runningServers.length > 0;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up MCP servers...');
    
    const stopPromises = Array.from(this.servers.keys())
      .map(serverName => this.stopServer(serverName));
    
    await Promise.all(stopPromises);
    console.log('✅ MCP servers cleanup completed');
  }
}