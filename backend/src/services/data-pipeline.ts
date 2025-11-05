import { DatabaseService } from './database.js';
import { CacheService } from './cache.js';
import { AIAnalysisService } from './ai-analysis.js';
import { MCPIntegrationService } from './mcp-integration.js';
import { EventEmitter } from 'events';

/**
 * Data Pipeline Service
 * Orchestrates data flow between MCP servers, database, cache, and AI analysis
 */

export interface PipelineJob {
  id: string;
  type: 'sync_cost_data' | 'generate_insights' | 'detect_anomalies' | 'update_recommendations';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: any;
}

export interface DataSyncResult {
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  errors: string[];
  duration: number;
}

export class DataPipelineService extends EventEmitter {
  private databaseService: DatabaseService;
  private cacheService: CacheService;
  private aiAnalysisService: AIAnalysisService;
  private mcpIntegrationService: MCPIntegrationService;
  
  private activeJobs = new Map<string, PipelineJob>();
  private jobHistory: PipelineJob[] = [];

  constructor(
    databaseService: DatabaseService,
    cacheService: CacheService,
    aiAnalysisService: AIAnalysisService,
    mcpIntegrationService: MCPIntegrationService
  ) {
    super();
    this.databaseService = databaseService;
    this.cacheService = cacheService;
    this.aiAnalysisService = aiAnalysisService;
    this.mcpIntegrationService = mcpIntegrationService;
    
    console.log('✅ Data Pipeline Service initialized');
  }

  /**
   * Sync cost data from MCP servers to database
   */
  async syncCostData(options: {
    startDate?: string;
    endDate?: string;
    departments?: string[];
    forceRefresh?: boolean;
  } = {}): Promise<DataSyncResult> {
    const jobId = this.generateJobId('sync_cost_data');
    const job = this.createJob(jobId, 'sync_cost_data', { options });

    try {
      this.updateJobProgress(jobId, 10, 'Starting cost data sync...');

      // Default to last 7 days if no date range specified
      const endDate = options.endDate || new Date().toISOString().split('T')[0];
      const startDate = options.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let totalRecordsProcessed = 0;
      let totalRecordsInserted = 0;
      let totalRecordsUpdated = 0;
      const errors: string[] = [];

      this.updateJobProgress(jobId, 20, 'Fetching data from MCP servers...');

      // Fetch data from Azure Cost MCP server
      const costDataResponse = await this.mcpIntegrationService.getCostData({
        startDate,
        endDate,
        department: options.departments?.[0] // For now, handle one department
      });

      if (!costDataResponse.success) {
        throw new Error(`Failed to fetch cost data: ${costDataResponse.error}`);
      }

      this.updateJobProgress(jobId, 40, 'Processing cost records...');

      const costRecords = costDataResponse.data?.data || [];
      totalRecordsProcessed = costRecords.length;

      if (costRecords.length > 0) {
        // Insert/update records in database
        await this.databaseService.insertCostRecords(costRecords);
        totalRecordsInserted = costRecords.length; // Simplified - in reality, track inserts vs updates

        this.updateJobProgress(jobId, 60, 'Updating cache...');

        // Update cache with fresh data
        const cacheKey = `cost-data:${startDate}:${endDate}`;
        await this.cacheService.setCostData(cacheKey, costDataResponse.data);

        // Invalidate related cached data
        await this.cacheService.deletePattern('dashboard:*');
        await this.cacheService.deletePattern('analysis:*');
      }

      this.updateJobProgress(jobId, 80, 'Triggering downstream processes...');

      // Trigger real-time insights generation
      this.emit('costDataUpdated', {
        recordCount: totalRecordsProcessed,
        dateRange: { startDate, endDate }
      });

      this.updateJobProgress(jobId, 100, 'Cost data sync completed');
      this.completeJob(jobId);

      const result: DataSyncResult = {
        recordsProcessed: totalRecordsProcessed,
        recordsInserted: totalRecordsInserted,
        recordsUpdated: totalRecordsUpdated,
        errors,
        duration: Date.now() - job.startedAt!.getTime()
      };

      console.log(`✅ Cost data sync completed: ${totalRecordsProcessed} records processed`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.failJob(jobId, errorMessage);
      
      return {
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        errors: [errorMessage],
        duration: Date.now() - job.startedAt!.getTime()
      };
    }
  }

  /**
   * Generate AI insights from recent cost data
   */
  async generateInsights(options: {
    days?: number;
    departments?: string[];
    forceRegenerate?: boolean;
  } = {}): Promise<void> {
    const jobId = this.generateJobId('generate_insights');
    const job = this.createJob(jobId, 'generate_insights', { options });

    try {
      this.updateJobProgress(jobId, 10, 'Fetching recent cost data...');

      const days = options.days || 30;
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get cost data from database
      const costRecords = await this.databaseService.getCostRecords({
        startDate,
        endDate,
        department: options.departments?.[0],
        limit: 5000
      });

      if (costRecords.length === 0) {
        this.completeJob(jobId, 'No cost data available for insights generation');
        return;
      }

      this.updateJobProgress(jobId, 30, 'Generating AI insights...');

      // Generate insights using AI service
      const insightsResponse = await this.aiAnalysisService.generateRealtimeInsights(
        costRecords,
        undefined, // No previous insights for now
        'system',
        'default'
      );

      this.updateJobProgress(jobId, 60, 'Saving insights to database...');

      // Save insights to database
      await this.databaseService.saveAnalysisResult({
        analysis_type: 'realtime_insights',
        input_data: { recordCount: costRecords.length, dateRange: { startDate, endDate } },
        result_data: insightsResponse.data,
        insights: insightsResponse.insights,
        confidence: insightsResponse.confidence
      });

      this.updateJobProgress(jobId, 80, 'Caching insights...');

      // Cache insights for quick access
      const cacheKey = `insights:realtime:${startDate}:${endDate}`;
      await this.cacheService.setAnalysisResult(cacheKey, insightsResponse);

      this.updateJobProgress(jobId, 100, 'Insights generation completed');
      this.completeJob(jobId);

      // Emit event for real-time updates
      this.emit('insightsGenerated', {
        insights: insightsResponse.insights,
        confidence: insightsResponse.confidence,
        recordCount: costRecords.length
      });

      console.log(`✅ AI insights generated for ${costRecords.length} records`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.failJob(jobId, errorMessage);
      console.error('❌ Insights generation failed:', errorMessage);
    }
  }

  /**
   * Detect cost anomalies and create alerts
   */
  async detectAnomalies(options: {
    days?: number;
    threshold?: number;
    departments?: string[];
  } = {}): Promise<void> {
    const jobId = this.generateJobId('detect_anomalies');
    const job = this.createJob(jobId, 'detect_anomalies', { options });

    try {
      this.updateJobProgress(jobId, 10, 'Fetching cost data for anomaly detection...');

      const days = options.days || 30;
      const threshold = options.threshold || 2.0;
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get cost data
      const costRecords = await this.databaseService.getCostRecords({
        startDate,
        endDate,
        department: options.departments?.[0],
        limit: 10000
      });

      if (costRecords.length < 7) {
        this.completeJob(jobId, 'Insufficient data for anomaly detection');
        return;
      }

      this.updateJobProgress(jobId, 30, 'Running anomaly detection...');

      // Detect anomalies using AI service
      const anomalyResponse = await this.aiAnalysisService.detectCostAnomalies(
        costRecords,
        {
          threshold,
          timeWindow: days,
          userId: 'system',
          organizationId: 'default'
        }
      );

      this.updateJobProgress(jobId, 60, 'Processing anomaly results...');

      if (anomalyResponse.success && anomalyResponse.data?.anomalies) {
        const anomalies = anomalyResponse.data.anomalies;

        // Create alerts for significant anomalies
        for (const anomaly of anomalies) {
          if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
            await this.databaseService.createAlert({
              type: 'cost_anomaly',
              severity: anomaly.severity,
              title: `Cost Anomaly Detected: ${anomaly.type}`,
              description: `Unusual ${anomaly.type} detected on ${anomaly.date}. Cost: $${anomaly.cost.toFixed(2)}, Expected: $${anomaly.expectedCost.toFixed(2)}`,
              data: anomaly,
              status: 'active'
            });
          }
        }

        // Save anomaly analysis results
        await this.databaseService.saveAnalysisResult({
          analysis_type: 'anomaly_detection',
          input_data: { recordCount: costRecords.length, threshold, days },
          result_data: anomalyResponse.data,
          insights: anomalyResponse.insights,
          confidence: anomalyResponse.confidence
        });

        this.updateJobProgress(jobId, 90, 'Caching anomaly results...');

        // Cache results
        const cacheKey = `anomalies:${startDate}:${endDate}:${threshold}`;
        await this.cacheService.setAnalysisResult(cacheKey, anomalyResponse);

        // Emit event for real-time notifications
        this.emit('anomaliesDetected', {
          anomalies,
          alertCount: anomalies.filter((a: any) => a.severity === 'high' || a.severity === 'critical').length
        });

        console.log(`✅ Anomaly detection completed: ${anomalies.length} anomalies found`);
      }

      this.updateJobProgress(jobId, 100, 'Anomaly detection completed');
      this.completeJob(jobId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.failJob(jobId, errorMessage);
      console.error('❌ Anomaly detection failed:', errorMessage);
    }
  }

  /**
   * Update optimization recommendations
   */
  async updateRecommendations(options: {
    departments?: string[];
    minSavings?: number;
  } = {}): Promise<void> {
    const jobId = this.generateJobId('update_recommendations');
    const job = this.createJob(jobId, 'update_recommendations', { options });

    try {
      this.updateJobProgress(jobId, 10, 'Fetching cost data for recommendations...');

      // Get recent cost data (last 30 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const costRecords = await this.databaseService.getCostRecords({
        startDate,
        endDate,
        department: options.departments?.[0],
        limit: 5000
      });

      this.updateJobProgress(jobId, 30, 'Generating optimization recommendations...');

      // Generate recommendations using AI service
      const recommendationsResponse = await this.aiAnalysisService.generateOptimizationRecommendations(
        costRecords,
        {
          department: options.departments?.[0],
          minSavings: options.minSavings || 100,
          riskTolerance: 'medium',
          userId: 'system',
          organizationId: 'default'
        }
      );

      this.updateJobProgress(jobId, 70, 'Saving recommendations...');

      // Save recommendations analysis
      await this.databaseService.saveAnalysisResult({
        analysis_type: 'optimization_recommendations',
        input_data: { recordCount: costRecords.length, minSavings: options.minSavings },
        result_data: recommendationsResponse.data,
        insights: recommendationsResponse.insights,
        confidence: recommendationsResponse.confidence
      });

      // Cache recommendations
      const cacheKey = `recommendations:${options.departments?.[0] || 'all'}:${options.minSavings || 100}`;
      await this.cacheService.setAnalysisResult(cacheKey, recommendationsResponse);

      this.updateJobProgress(jobId, 100, 'Recommendations update completed');
      this.completeJob(jobId);

      // Emit event
      this.emit('recommendationsUpdated', {
        recommendations: recommendationsResponse.data?.recommendations || [],
        totalSavings: recommendationsResponse.data?.totalSavings || 0
      });

      console.log(`✅ Optimization recommendations updated`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.failJob(jobId, errorMessage);
      console.error('❌ Recommendations update failed:', errorMessage);
    }
  }

  // Job management methods
  private generateJobId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createJob(id: string, type: PipelineJob['type'], metadata?: any): PipelineJob {
    const job: PipelineJob = {
      id,
      type,
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
      metadata
    };

    this.activeJobs.set(id, job);
    job.status = 'running';
    
    this.emit('jobStarted', job);
    return job;
  }

  private updateJobProgress(jobId: string, progress: number, message?: string): void {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.progress = progress;
      if (message) {
        job.metadata = { ...job.metadata, currentMessage: message };
      }
      this.emit('jobProgress', job);
    }
  }

  private completeJob(jobId: string, message?: string): void {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      if (message) {
        job.metadata = { ...job.metadata, completionMessage: message };
      }
      
      this.moveJobToHistory(jobId);
      this.emit('jobCompleted', job);
    }
  }

  private failJob(jobId: string, error: string): void {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.completedAt = new Date();
      
      this.moveJobToHistory(jobId);
      this.emit('jobFailed', job);
    }
  }

  private moveJobToHistory(jobId: string): void {
    const job = this.activeJobs.get(jobId);
    if (job) {
      this.activeJobs.delete(jobId);
      this.jobHistory.push(job);
      
      // Keep history limited
      if (this.jobHistory.length > 100) {
        this.jobHistory = this.jobHistory.slice(-50);
      }
    }
  }

  // Public methods for job monitoring
  getActiveJobs(): PipelineJob[] {
    return Array.from(this.activeJobs.values());
  }

  getJobHistory(limit = 20): PipelineJob[] {
    return this.jobHistory
      .sort((a, b) => b.startedAt!.getTime() - a.startedAt!.getTime())
      .slice(0, limit);
  }

  getJobStatus(jobId: string): PipelineJob | null {
    return this.activeJobs.get(jobId) || 
           this.jobHistory.find(job => job.id === jobId) || 
           null;
  }

  // Health and statistics
  getStatistics(): {
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageJobDuration: number;
  } {
    const completed = this.jobHistory.filter(job => job.status === 'completed');
    const failed = this.jobHistory.filter(job => job.status === 'failed');
    
    const avgDuration = completed.length > 0
      ? completed.reduce((sum, job) => {
          const duration = job.completedAt!.getTime() - job.startedAt!.getTime();
          return sum + duration;
        }, 0) / completed.length
      : 0;

    return {
      activeJobs: this.activeJobs.size,
      completedJobs: completed.length,
      failedJobs: failed.length,
      averageJobDuration: avgDuration
    };
  }

  isHealthy(): boolean {
    return this.activeJobs.size < 10; // Prevent job queue overflow
  }
}