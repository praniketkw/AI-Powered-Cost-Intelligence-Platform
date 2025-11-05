import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AIAnalysisService } from '../services/ai-analysis.js';
import { DataPipelineService } from '../services/data-pipeline.js';
import { CacheService } from '../services/cache.js';
import { validateRequest } from '../middleware/validation.js';

/**
 * AI Analysis API Routes
 * Handles AI-powered cost analysis, insights, and interactive queries
 */

const InteractiveQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  context: z.record(z.any()).optional(),
  department: z.string().optional(),
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }).optional()
});

const AnomalyDetectionSchema = z.object({
  days: z.number().min(7).max(365).default(30),
  threshold: z.number().min(1).max(5).default(2.0),
  department: z.string().optional(),
  businessContext: z.record(z.any()).optional()
});

const ForecastingSchema = z.object({
  forecastPeriod: z.enum(['1 month', '3 months', '6 months', '1 year']).default('3 months'),
  scenarios: z.array(z.string()).optional(),
  businessFactors: z.record(z.any()).optional(),
  department: z.string().optional()
});

const BatchAnalysisSchema = z.object({
  analyses: z.array(z.object({
    type: z.enum(['cost_analysis', 'anomaly_detection', 'optimization', 'forecasting']),
    parameters: z.record(z.any())
  })).min(1).max(10)
});

export function analysisRoutes(
  aiAnalysisService: AIAnalysisService,
  dataPipelineService: DataPipelineService,
  cacheService: CacheService
): Router {
  const router = Router();

  /**
   * POST /api/analysis/query
   * Process interactive natural language queries about cost data
   */
  router.post('/query', validateRequest(InteractiveQuerySchema, 'body'), async (req: Request, res: Response) => {
    try {
      const { query, context, department, dateRange } = req.body;
      const userId = req.headers['x-user-id'] as string || 'anonymous';
      const organizationId = req.headers['x-organization-id'] as string || 'default';

      // Generate cache key for similar queries
      const cacheKey = `query:${Buffer.from(query).toString('base64').slice(0, 32)}:${department || 'all'}`;
      
      // Check cache for recent similar queries
      const cachedResult = await cacheService.getAnalysisResult(cacheKey);
      if (cachedResult && Date.now() - new Date(cachedResult.timestamp).getTime() < 300000) { // 5 minutes
        return res.json({
          success: true,
          data: cachedResult,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Fetch relevant cost data
      const costData = await fetchCostDataForQuery(department, dateRange);

      // Process the query
      const analysisResult = await aiAnalysisService.processInteractiveQuery(
        query,
        costData,
        context,
        userId,
        organizationId
      );

      // Cache the result
      await cacheService.setAnalysisResult(cacheKey, {
        ...analysisResult,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: analysisResult,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Interactive query error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process query',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/analysis/anomalies
   * Detect cost anomalies with AI explanations
   */
  router.post('/anomalies', validateRequest(AnomalyDetectionSchema, 'body'), async (req: Request, res: Response) => {
    try {
      const { days, threshold, department, businessContext } = req.body;
      const userId = req.headers['x-user-id'] as string || 'system';
      const organizationId = req.headers['x-organization-id'] as string || 'default';

      const cacheKey = `anomalies:${days}:${threshold}:${department || 'all'}`;
      
      // Check cache
      const cachedResult = await cacheService.getAnalysisResult(cacheKey);
      if (cachedResult && Date.now() - new Date(cachedResult.timestamp).getTime() < 1800000) { // 30 minutes
        return res.json({
          success: true,
          data: cachedResult,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Fetch cost data for anomaly detection
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const costData = await fetchCostDataForDateRange(startDate, endDate, department);

      // Detect anomalies
      const anomalyResult = await aiAnalysisService.detectCostAnomalies(
        costData,
        {
          threshold,
          timeWindow: days,
          businessContext,
          userId,
          organizationId
        }
      );

      // Cache the result
      await cacheService.setAnalysisResult(cacheKey, {
        ...anomalyResult,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: anomalyResult,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Anomaly detection error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect anomalies',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/analysis/forecast
   * Generate cost forecasts with scenario analysis
   */
  router.post('/forecast', validateRequest(ForecastingSchema, 'body'), async (req: Request, res: Response) => {
    try {
      const { forecastPeriod, scenarios, businessFactors, department } = req.body;
      const userId = req.headers['x-user-id'] as string || 'system';
      const organizationId = req.headers['x-organization-id'] as string || 'default';

      const cacheKey = `forecast:${forecastPeriod}:${department || 'all'}`;
      
      // Check cache
      const cachedResult = await cacheService.getAnalysisResult(cacheKey);
      if (cachedResult && Date.now() - new Date(cachedResult.timestamp).getTime() < 3600000) { // 1 hour
        return res.json({
          success: true,
          data: cachedResult,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Fetch historical data (last 90 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const historicalData = await fetchCostDataForDateRange(startDate, endDate, department);

      // Generate forecast
      const forecastResult = await aiAnalysisService.forecastCosts(
        historicalData,
        {
          forecastPeriod,
          scenarios,
          businessFactors,
          userId,
          organizationId
        }
      );

      // Cache the result
      await cacheService.setAnalysisResult(cacheKey, {
        ...forecastResult,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: forecastResult,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Forecasting error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate forecast',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/analysis/insights
   * Generate real-time insights from current cost data
   */
  router.post('/insights', async (req: Request, res: Response) => {
    try {
      const { department, days = 7 } = req.body;
      const userId = req.headers['x-user-id'] as string || 'system';
      const organizationId = req.headers['x-organization-id'] as string || 'default';

      const cacheKey = `insights:${days}:${department || 'all'}`;
      
      // Check cache
      const cachedResult = await cacheService.getAnalysisResult(cacheKey);
      if (cachedResult && Date.now() - new Date(cachedResult.timestamp).getTime() < 600000) { // 10 minutes
        return res.json({
          success: true,
          data: cachedResult,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Fetch recent cost data
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const costData = await fetchCostDataForDateRange(startDate, endDate, department);

      // Generate insights
      const insightsResult = await aiAnalysisService.generateRealtimeInsights(
        costData,
        undefined, // No previous insights
        userId,
        organizationId
      );

      // Cache the result
      await cacheService.setAnalysisResult(cacheKey, {
        ...insightsResult,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: insightsResult,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Insights generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/analysis/batch
   * Process multiple analysis requests in batch
   */
  router.post('/batch', validateRequest(BatchAnalysisSchema, 'body'), async (req: Request, res: Response) => {
    try {
      const { analyses } = req.body;
      const userId = req.headers['x-user-id'] as string || 'system';
      const organizationId = req.headers['x-organization-id'] as string || 'default';

      // Convert batch requests to enhanced analysis requests
      const analysisRequests = analyses.map((analysis: any) => ({
        type: analysis.type,
        data: analysis.parameters,
        userId,
        organizationId,
        priority: 'medium' as const
      }));

      // Process batch analysis
      const batchResults = await aiAnalysisService.processBatchAnalysis(analysisRequests);

      res.json({
        success: true,
        data: {
          results: batchResults,
          summary: {
            totalRequests: analyses.length,
            successfulRequests: batchResults.filter(r => r.success).length,
            failedRequests: batchResults.filter(r => !r.success).length
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Batch analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process batch analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/analysis/jobs
   * Get analysis job status and history
   */
  router.get('/jobs', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const organizationId = req.headers['x-organization-id'] as string;
      const { status, limit = 50 } = req.query;

      let jobs;
      if (status === 'active') {
        jobs = aiAnalysisService.getActiveJobs(userId, organizationId);
      } else {
        jobs = aiAnalysisService.getAnalysisHistory(userId, organizationId, parseInt(limit as string));
      }

      res.json({
        success: true,
        data: {
          jobs,
          statistics: aiAnalysisService.getStatistics()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Jobs retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve jobs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/analysis/jobs/:jobId
   * Get specific job status
   */
  router.get('/jobs/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      
      const job = aiAnalysisService.getJobStatus(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      res.json({
        success: true,
        data: job,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Job status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve job status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * DELETE /api/analysis/jobs/:jobId
   * Cancel an active analysis job
   */
  router.delete('/jobs/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      
      const cancelled = aiAnalysisService.cancelJob(jobId);
      
      if (!cancelled) {
        return res.status(400).json({
          success: false,
          error: 'Job cannot be cancelled (not found or not in pending state)'
        });
      }

      res.json({
        success: true,
        data: { jobId, status: 'cancelled' },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Job cancellation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel job',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

// Helper functions
async function fetchCostDataForQuery(department?: string, dateRange?: { startDate: string; endDate: string }): Promise<any[]> {
  // This would typically fetch from database or MCP service
  // For now, return mock data
  const endDate = dateRange?.endDate || new Date().toISOString().split('T')[0];
  const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return generateMockCostData(startDate, endDate, department);
}

async function fetchCostDataForDateRange(startDate: string, endDate: string, department?: string): Promise<any[]> {
  // This would typically fetch from database or MCP service
  return generateMockCostData(startDate, endDate, department);
}

function generateMockCostData(startDate: string, endDate: string, department?: string): any[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  const data = [];
  const departments = department ? [department] : ['engineering', 'marketing', 'sales', 'operations'];
  const services = ['Virtual Machines', 'Storage', 'App Service', 'SQL Database', 'CDN'];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    for (const dept of departments) {
      for (const service of services) {
        data.push({
          id: `cost-${date.toISOString().split('T')[0]}-${dept}-${service}-${Math.random().toString(36).substr(2, 9)}`,
          date: date.toISOString().split('T')[0],
          cost: Math.random() * 500 + 50,
          currency: 'USD',
          resourceGroup: `rg-${dept}`,
          serviceName: service,
          resourceType: `Microsoft.${service.replace(' ', '')}`,
          department: dept,
          subscriptionId: 'sub-12345',
          tags: { environment: 'production', team: dept },
          metadata: { region: 'eastus' }
        });
      }
    }
  }
  
  return data;
}