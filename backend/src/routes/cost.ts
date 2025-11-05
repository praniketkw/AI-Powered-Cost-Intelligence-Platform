import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataPipelineService } from '../services/data-pipeline.js';
import { CacheService } from '../services/cache.js';
import { MCPIntegrationService } from '../services/mcp-integration.js';
import { validateRequest } from '../middleware/validation.js';

/**
 * Cost Data API Routes
 * Handles cost data retrieval, filtering, and aggregation
 */

const GetCostDataSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  department: z.string().optional(),
  serviceType: z.string().optional(),
  limit: z.coerce.number().min(1).max(10000).default(1000),
  offset: z.coerce.number().min(0).default(0)
});

const SyncCostDataSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  departments: z.array(z.string()).optional(),
  forceRefresh: z.boolean().default(false)
});

export function costRoutes(
  dataPipelineService: DataPipelineService,
  cacheService: CacheService,
  mcpIntegrationService: MCPIntegrationService
): Router {
  const router = Router();

  /**
   * GET /api/cost/data
   * Retrieve cost data with filtering and pagination
   */
  router.get('/data', validateRequest(GetCostDataSchema, 'query'), async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, department, serviceType, limit, offset } = req.query as any;

      // Generate cache key
      const cacheKey = `cost-data:${startDate || 'all'}:${endDate || 'all'}:${department || 'all'}:${serviceType || 'all'}:${limit}:${offset}`;
      
      // Try to get from cache first
      const cachedData = await cacheService.getCostData(cacheKey);
      if (cachedData) {
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Fetch from MCP server
      const mcpResponse = await mcpIntegrationService.getCostData({
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0],
        department,
        resourceType: serviceType
      });

      if (!mcpResponse.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch cost data',
          details: mcpResponse.error
        });
      }

      // Apply pagination to the data
      const allData = mcpResponse.data?.data || [];
      const paginatedData = allData.slice(offset, offset + limit);
      
      const result = {
        data: paginatedData,
        pagination: {
          total: allData.length,
          limit,
          offset,
          hasMore: offset + limit < allData.length
        },
        summary: mcpResponse.data?.summary,
        source: mcpResponse.data?.source || 'mcp-server'
      };

      // Cache the result
      await cacheService.setCostData(cacheKey, result);

      res.json({
        success: true,
        data: result,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cost data retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/cost/summary
   * Get cost summary and statistics
   */
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, department } = req.query;

      const cacheKey = `cost-summary:${startDate || 'all'}:${endDate || 'all'}:${department || 'all'}`;
      
      // Try cache first
      const cachedSummary = await cacheService.get(cacheKey);
      if (cachedSummary) {
        return res.json({
          success: true,
          data: cachedSummary,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Get cost data for summary
      const mcpResponse = await mcpIntegrationService.getCostData({
        startDate: startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: endDate as string || new Date().toISOString().split('T')[0],
        department: department as string
      });

      if (!mcpResponse.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch cost data for summary'
        });
      }

      const costData = mcpResponse.data?.data || [];
      
      // Calculate summary statistics
      const summary = {
        totalCost: costData.reduce((sum: number, record: any) => sum + record.cost, 0),
        recordCount: costData.length,
        averageDailyCost: costData.length > 0 ? costData.reduce((sum: number, record: any) => sum + record.cost, 0) / costData.length : 0,
        departmentBreakdown: calculateDepartmentBreakdown(costData),
        serviceBreakdown: calculateServiceBreakdown(costData),
        dailyTrend: calculateDailyTrend(costData),
        topSpenders: getTopSpenders(costData, 10),
        dateRange: {
          start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: endDate || new Date().toISOString().split('T')[0]
        }
      };

      // Cache the summary
      await cacheService.set(cacheKey, summary, { ttl: 1800 }); // 30 minutes

      res.json({
        success: true,
        data: summary,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cost summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/cost/sync
   * Trigger cost data synchronization
   */
  router.post('/sync', validateRequest(SyncCostDataSchema, 'body'), async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, departments, forceRefresh } = req.body;

      // Start the sync process
      const syncResult = await dataPipelineService.syncCostData({
        startDate,
        endDate,
        departments,
        forceRefresh
      });

      res.json({
        success: true,
        data: syncResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cost sync error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync cost data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/cost/trends
   * Get cost trends and patterns
   */
  router.get('/trends', async (req: Request, res: Response) => {
    try {
      const { resourceType, period = 'daily', days = 30 } = req.query;

      const mcpResponse = await mcpIntegrationService.getUsageTrends({
        resourceType: resourceType as string,
        period: period as 'daily' | 'weekly' | 'monthly',
        days: parseInt(days as string)
      });

      if (!mcpResponse.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch usage trends'
        });
      }

      res.json({
        success: true,
        data: mcpResponse.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cost trends error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/cost/departments
   * Get cost breakdown by department
   */
  router.get('/departments', async (req: Request, res: Response) => {
    try {
      const { month } = req.query;

      const cacheKey = `department-breakdown:${month || 'current'}`;
      
      // Try cache first
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      const mcpResponse = await mcpIntegrationService.getDepartmentBreakdown({
        month: month as string
      });

      if (!mcpResponse.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch department breakdown'
        });
      }

      // Cache the result
      await cacheService.set(cacheKey, mcpResponse.data, { ttl: 3600 }); // 1 hour

      res.json({
        success: true,
        data: mcpResponse.data,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Department breakdown error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

// Helper functions for summary calculations
function calculateDepartmentBreakdown(costData: any[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  
  for (const record of costData) {
    const dept = record.department || 'Unknown';
    breakdown[dept] = (breakdown[dept] || 0) + record.cost;
  }
  
  return breakdown;
}

function calculateServiceBreakdown(costData: any[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  
  for (const record of costData) {
    const service = record.serviceName || 'Unknown';
    breakdown[service] = (breakdown[service] || 0) + record.cost;
  }
  
  return breakdown;
}

function calculateDailyTrend(costData: any[]): Array<{ date: string; cost: number }> {
  const dailyTotals: Record<string, number> = {};
  
  for (const record of costData) {
    const date = record.date;
    dailyTotals[date] = (dailyTotals[date] || 0) + record.cost;
  }
  
  return Object.entries(dailyTotals)
    .map(([date, cost]) => ({ date, cost }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getTopSpenders(costData: any[], limit: number): Array<{ resource: string; cost: number; department: string }> {
  const resourceTotals: Record<string, { cost: number; department: string }> = {};
  
  for (const record of costData) {
    const resource = `${record.resourceGroup}/${record.serviceName}`;
    if (!resourceTotals[resource]) {
      resourceTotals[resource] = { cost: 0, department: record.department };
    }
    resourceTotals[resource].cost += record.cost;
  }
  
  return Object.entries(resourceTotals)
    .map(([resource, data]) => ({ resource, cost: data.cost, department: data.department }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit);
}