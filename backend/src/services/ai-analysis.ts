import { AIAnalysisEngine, AnalysisRequest, AnalysisResponse } from '../../../ai-analysis-engine/src/core/analysis-engine.js';

/**
 * AI Analysis Service - Backend wrapper for the AI Analysis Engine
 * Provides enterprise-grade AI analysis capabilities with caching and error handling
 */

export interface EnhancedAnalysisRequest extends AnalysisRequest {
  userId?: string;
  organizationId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface EnhancedAnalysisResponse extends AnalysisResponse {
  requestId: string;
  userId?: string;
  organizationId?: string;
  cached: boolean;
  processingTime: number;
}

export interface AnalysisJob {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  request: EnhancedAnalysisRequest;
  response?: EnhancedAnalysisResponse;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class AIAnalysisService {
  private analysisEngine: AIAnalysisEngine;
  private activeJobs = new Map<string, AnalysisJob>();
  private jobHistory: AnalysisJob[] = [];
  private isHealthy = true;

  constructor(anthropicApiKey: string) {
    this.analysisEngine = new AIAnalysisEngine(anthropicApiKey);
    console.log('✅ AI Analysis Service initialized');
  }

  /**
   * Process analysis request with enhanced features
   */
  async processAnalysis(request: EnhancedAnalysisRequest): Promise<EnhancedAnalysisResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Create job tracking
    const job: AnalysisJob = {
      id: requestId,
      type: request.type,
      status: 'pending',
      request,
      createdAt: new Date()
    };

    this.activeJobs.set(requestId, job);

    try {
      // Update job status
      job.status = 'processing';

      // Process with AI engine
      const response = await this.analysisEngine.analyze(request);
      const processingTime = Date.now() - startTime;

      // Create enhanced response
      const enhancedResponse: EnhancedAnalysisResponse = {
        ...response,
        requestId,
        userId: request.userId,
        organizationId: request.organizationId,
        cached: false,
        processingTime
      };

      // Update job
      job.status = 'completed';
      job.response = enhancedResponse;
      job.completedAt = new Date();

      // Move to history
      this.moveJobToHistory(requestId);

      return enhancedResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Update job with error
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();

      // Move to history
      this.moveJobToHistory(requestId);

      // Return error response
      return {
        requestId,
        userId: request.userId,
        organizationId: request.organizationId,
        cached: false,
        processingTime,
        success: false,
        data: null,
        insights: [`Analysis failed: ${job.error}`],
        confidence: 0,
        metadata: {
          processingTime,
          analysisType: request.type
        }
      };
    }
  }

  /**
   * Interactive query processing with context awareness
   */
  async processInteractiveQuery(
    query: string, 
    costData: any[], 
    context?: any,
    userId?: string,
    organizationId?: string
  ): Promise<EnhancedAnalysisResponse> {
    const request: EnhancedAnalysisRequest = {
      type: 'interactive_query',
      data: { query, costData: this.sampleLargeDataset(costData, 1000) },
      context,
      userId,
      organizationId,
      priority: 'medium'
    };

    return this.processAnalysis(request);
  }

  /**
   * Real-time insights generation
   */
  async generateRealtimeInsights(
    costData: any[],
    previousInsights?: string[],
    userId?: string,
    organizationId?: string
  ): Promise<EnhancedAnalysisResponse> {
    const request: EnhancedAnalysisRequest = {
      type: 'cost_analysis',
      data: { 
        costData: this.sampleLargeDataset(costData, 500), 
        previousInsights 
      },
      options: { realtime: true, focus: 'trends_and_alerts' },
      userId,
      organizationId,
      priority: 'high'
    };

    return this.processAnalysis(request);
  }

  /**
   * Batch analysis for multiple datasets
   */
  async processBatchAnalysis(
    requests: EnhancedAnalysisRequest[]
  ): Promise<EnhancedAnalysisResponse[]> {
    const batchPromises = requests.map(request => this.processAnalysis(request));
    
    try {
      return await Promise.all(batchPromises);
    } catch (error) {
      console.error('Batch analysis error:', error);
      // Return partial results for successful analyses
      const results = await Promise.allSettled(batchPromises);
      return results
        .filter((result): result is PromiseFulfilledResult<EnhancedAnalysisResponse> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
    }
  }

  /**
   * Cost anomaly detection with business context
   */
  async detectCostAnomalies(
    costData: any[],
    options: {
      threshold?: number;
      timeWindow?: number;
      businessContext?: any;
      userId?: string;
      organizationId?: string;
    } = {}
  ): Promise<EnhancedAnalysisResponse> {
    const request: EnhancedAnalysisRequest = {
      type: 'anomaly_detection',
      data: { 
        costData: this.sampleLargeDataset(costData, 2000),
        threshold: options.threshold || 2.0,
        businessContext: options.businessContext
      },
      options: { timeWindow: options.timeWindow || 30 },
      userId: options.userId,
      organizationId: options.organizationId,
      priority: 'high'
    };

    return this.processAnalysis(request);
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizationRecommendations(
    costData: any[],
    context: {
      department?: string;
      minSavings?: number;
      riskTolerance?: 'low' | 'medium' | 'high';
      userId?: string;
      organizationId?: string;
    } = {}
  ): Promise<EnhancedAnalysisResponse> {
    const request: EnhancedAnalysisRequest = {
      type: 'optimization',
      data: { costData: this.sampleLargeDataset(costData, 1500) },
      context: {
        department: context.department,
        minSavings: context.minSavings || 100,
        riskTolerance: context.riskTolerance || 'medium'
      },
      userId: context.userId,
      organizationId: context.organizationId,
      priority: 'medium'
    };

    return this.processAnalysis(request);
  }

  /**
   * Cost forecasting with scenario analysis
   */
  async forecastCosts(
    historicalData: any[],
    options: {
      forecastPeriod?: string;
      scenarios?: string[];
      businessFactors?: any;
      userId?: string;
      organizationId?: string;
    } = {}
  ): Promise<EnhancedAnalysisResponse> {
    const request: EnhancedAnalysisRequest = {
      type: 'forecasting',
      data: { 
        historicalData: this.sampleLargeDataset(historicalData, 3000),
        forecastPeriod: options.forecastPeriod || '3 months',
        scenarios: options.scenarios || ['optimistic', 'realistic', 'pessimistic'],
        businessFactors: options.businessFactors
      },
      userId: options.userId,
      organizationId: options.organizationId,
      priority: 'medium'
    };

    return this.processAnalysis(request);
  }

  /**
   * Get analysis job status
   */
  getJobStatus(jobId: string): AnalysisJob | null {
    return this.activeJobs.get(jobId) || 
           this.jobHistory.find(job => job.id === jobId) || 
           null;
  }

  /**
   * Get active jobs for monitoring
   */
  getActiveJobs(userId?: string, organizationId?: string): AnalysisJob[] {
    const jobs = Array.from(this.activeJobs.values());
    
    if (userId) {
      return jobs.filter(job => job.request.userId === userId);
    }
    
    if (organizationId) {
      return jobs.filter(job => job.request.organizationId === organizationId);
    }
    
    return jobs;
  }

  /**
   * Get analysis history
   */
  getAnalysisHistory(
    userId?: string, 
    organizationId?: string, 
    limit = 50
  ): AnalysisJob[] {
    let history = this.jobHistory;
    
    if (userId) {
      history = history.filter(job => job.request.userId === userId);
    }
    
    if (organizationId) {
      history = history.filter(job => job.request.organizationId === organizationId);
    }
    
    return history
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Cancel active job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.completedAt = new Date();
      this.moveJobToHistory(jobId);
      return true;
    }
    return false;
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
    successRate: number;
  } {
    const completed = this.jobHistory.filter(job => job.status === 'completed');
    const failed = this.jobHistory.filter(job => job.status === 'failed');
    
    const avgProcessingTime = completed.length > 0 
      ? completed.reduce((sum, job) => {
          const duration = job.completedAt!.getTime() - job.createdAt.getTime();
          return sum + duration;
        }, 0) / completed.length
      : 0;

    const successRate = this.jobHistory.length > 0 
      ? (completed.length / this.jobHistory.length) * 100 
      : 0;

    return {
      activeJobs: this.activeJobs.size,
      completedJobs: completed.length,
      failedJobs: failed.length,
      averageProcessingTime: avgProcessingTime,
      successRate
    };
  }

  // Private helper methods
  private generateRequestId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private moveJobToHistory(jobId: string): void {
    const job = this.activeJobs.get(jobId);
    if (job) {
      this.activeJobs.delete(jobId);
      this.jobHistory.push(job);
      
      // Keep history limited to prevent memory issues
      if (this.jobHistory.length > 1000) {
        this.jobHistory = this.jobHistory.slice(-500);
      }
    }
  }

  private sampleLargeDataset(data: any[], maxSize: number): any[] {
    if (data.length <= maxSize) {
      return data;
    }
    
    // Intelligent sampling: recent data + random older data
    const recentData = data.slice(-Math.floor(maxSize * 0.7));
    const olderData = data.slice(0, -Math.floor(maxSize * 0.7));
    const randomOlderSample = olderData
      .sort(() => Math.random() - 0.5)
      .slice(0, maxSize - recentData.length);
    
    return [...randomOlderSample, ...recentData];
  }

  // Health check
  isHealthy(): boolean {
    return this.isHealthy && this.activeJobs.size < 100; // Prevent overload
  }

  // Cleanup method
  cleanup(): void {
    // Clean up old completed jobs
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    this.jobHistory = this.jobHistory.filter(
      job => job.createdAt.getTime() > cutoffTime
    );

    console.log(`🧹 AI Analysis Service cleanup completed. History size: ${this.jobHistory.length}`);
  }
}