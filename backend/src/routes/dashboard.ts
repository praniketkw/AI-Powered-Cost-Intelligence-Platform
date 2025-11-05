import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataPipelineService } from '../services/data-pipeline.js';
import { CacheService } from '../services/cache.js';
import { AIAnalysisService } from '../services/ai-analysis.js';
import { validateRequest } from '../middleware/validation.js';

/**
 * Dashboard API Routes
 * Provides aggregated data for dashboard views and widgets
 */

const DashboardFiltersSchema = z.object({
  department: z.string().optional(),
  timeframe: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  includeForecasts: z.boolean().default(false),
  includeRecommendations: z.boolean().default(true)
});

export function dashboardRoutes(
  dataPipelineService: DataPipelineService,
  cacheService: CacheService,
  aiAnalysisService: AIAnalysisService
): Router {
  const router = Router();

  /**
   * GET /api/dashboard/overview
   * Get main dashboard overview data
   */
  router.get('/overview', validateRequest(DashboardFiltersSchema, 'query'), async (req: Request, res: Response) => {
    try {
      const { department, timeframe, includeForecasts, includeRecommendations } = req.query as any;

      const cacheKey = `dashboard:overview:${department || 'all'}:${timeframe}:${includeForecasts}:${includeRecommendations}`;
      
      // Check cache first
      const cachedData = await cacheService.getDashboardData(cacheKey);
      if (cachedData) {
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Generate dashboard data
      const overviewData = await generateDashboardOverview(
        department,
        timeframe,
        includeForecasts,
        includeRecommendations,
        aiAnalysisService
      );

      // Cache the result
      await cacheService.setDashboardData(cacheKey, overviewData);

      res.json({
        success: true,
        data: overviewData,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard overview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate dashboard overview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/dashboard/metrics
   * Get key performance metrics
   */
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const { department, timeframe = '30d' } = req.query;

      const cacheKey = `dashboard:metrics:${department || 'all'}:${timeframe}`;
      
      // Check cache
      const cachedMetrics = await cacheService.getDashboardData(cacheKey);
      if (cachedMetrics) {
        return res.json({
          success: true,
          data: cachedMetrics,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      const metrics = generateKeyMetrics(department as string, timeframe as string);

      // Cache metrics
      await cacheService.setDashboardData(cacheKey, metrics);

      res.json({
        success: true,
        data: metrics,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/dashboard/trends
   * Get cost trends and patterns
   */
  router.get('/trends', async (req: Request, res: Response) => {
    try {
      const { department, timeframe = '30d', granularity = 'daily' } = req.query;

      const cacheKey = `dashboard:trends:${department || 'all'}:${timeframe}:${granularity}`;
      
      // Check cache
      const cachedTrends = await cacheService.getDashboardData(cacheKey);
      if (cachedTrends) {
        return res.json({
          success: true,
          data: cachedTrends,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      const trends = generateCostTrends(
        department as string,
        timeframe as string,
        granularity as string
      );

      // Cache trends
      await cacheService.setDashboardData(cacheKey, trends);

      res.json({
        success: true,
        data: trends,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard trends error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate trends',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/dashboard/breakdown
   * Get cost breakdown by various dimensions
   */
  router.get('/breakdown', async (req: Request, res: Response) => {
    try {
      const { 
        dimension = 'department', 
        timeframe = '30d',
        limit = 10 
      } = req.query;

      const cacheKey = `dashboard:breakdown:${dimension}:${timeframe}:${limit}`;
      
      // Check cache
      const cachedBreakdown = await cacheService.getDashboardData(cacheKey);
      if (cachedBreakdown) {
        return res.json({
          success: true,
          data: cachedBreakdown,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      const breakdown = generateCostBreakdown(
        dimension as string,
        timeframe as string,
        parseInt(limit as string)
      );

      // Cache breakdown
      await cacheService.setDashboardData(cacheKey, breakdown);

      res.json({
        success: true,
        data: breakdown,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard breakdown error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate breakdown',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/dashboard/alerts-summary
   * Get alerts summary for dashboard
   */
  router.get('/alerts-summary', async (req: Request, res: Response) => {
    try {
      const { department } = req.query;

      const cacheKey = `dashboard:alerts:${department || 'all'}`;
      
      // Check cache
      const cachedAlerts = await cacheService.getDashboardData(cacheKey);
      if (cachedAlerts) {
        return res.json({
          success: true,
          data: cachedAlerts,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      const alertsSummary = generateAlertsSummary(department as string);

      // Cache alerts summary
      await cacheService.setDashboardData(cacheKey, alertsSummary);

      res.json({
        success: true,
        data: alertsSummary,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard alerts summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate alerts summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/dashboard/recommendations-summary
   * Get optimization recommendations summary
   */
  router.get('/recommendations-summary', async (req: Request, res: Response) => {
    try {
      const { department, limit = 5 } = req.query;

      const cacheKey = `dashboard:recommendations:${department || 'all'}:${limit}`;
      
      // Check cache
      const cachedRecommendations = await cacheService.getDashboardData(cacheKey);
      if (cachedRecommendations) {
        return res.json({
          success: true,
          data: cachedRecommendations,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      const recommendationsSummary = generateRecommendationsSummary(
        department as string,
        parseInt(limit as string)
      );

      // Cache recommendations
      await cacheService.setDashboardData(cacheKey, recommendationsSummary);

      res.json({
        success: true,
        data: recommendationsSummary,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard recommendations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate recommendations summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/dashboard/widgets/:widgetId
   * Get specific widget data
   */
  router.get('/widgets/:widgetId', async (req: Request, res: Response) => {
    try {
      const { widgetId } = req.params;
      const { department, timeframe = '30d' } = req.query;

      const cacheKey = `dashboard:widget:${widgetId}:${department || 'all'}:${timeframe}`;
      
      // Check cache
      const cachedWidget = await cacheService.getDashboardData(cacheKey);
      if (cachedWidget) {
        return res.json({
          success: true,
          data: cachedWidget,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      const widgetData = generateWidgetData(
        widgetId,
        department as string,
        timeframe as string
      );

      if (!widgetData) {
        return res.status(404).json({
          success: false,
          error: 'Widget not found'
        });
      }

      // Cache widget data
      await cacheService.setDashboardData(cacheKey, widgetData);

      res.json({
        success: true,
        data: widgetData,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard widget error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate widget data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/dashboard/refresh
   * Force refresh dashboard cache
   */
  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { widgets, department } = req.body;

      // Clear dashboard cache
      if (widgets && Array.isArray(widgets)) {
        // Clear specific widgets
        for (const widget of widgets) {
          await cacheService.deletePattern(`dashboard:${widget}:*`);
        }
      } else {
        // Clear all dashboard cache
        await cacheService.deletePattern('dashboard:*');
      }

      res.json({
        success: true,
        data: {
          message: 'Dashboard cache refreshed successfully',
          clearedWidgets: widgets || 'all',
          department: department || 'all'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh dashboard',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

// Helper functions for generating dashboard data
async function generateDashboardOverview(
  department?: string,
  timeframe?: string,
  includeForecasts?: boolean,
  includeRecommendations?: boolean,
  aiAnalysisService?: AIAnalysisService
) {
  const currentPeriodCost = Math.random() * 50000 + 20000;
  const previousPeriodCost = Math.random() * 45000 + 18000;
  const changePercent = ((currentPeriodCost - previousPeriodCost) / previousPeriodCost) * 100;

  const overview = {
    summary: {
      totalCost: currentPeriodCost,
      previousPeriodCost,
      changePercent,
      changeDirection: changePercent > 0 ? 'increase' : 'decrease',
      budget: 60000,
      budgetUtilization: (currentPeriodCost / 60000) * 100,
      timeframe,
      department: department || 'all'
    },
    keyMetrics: {
      averageDailyCost: currentPeriodCost / getDaysInTimeframe(timeframe || '30d'),
      costPerUser: currentPeriodCost / 150, // Assuming 150 users
      topSpendingService: 'Virtual Machines',
      topSpendingDepartment: 'Engineering',
      anomaliesDetected: Math.floor(Math.random() * 5) + 1,
      activeAlerts: Math.floor(Math.random() * 8) + 2
    },
    trends: generateCostTrends(department, timeframe || '30d', 'daily'),
    breakdown: {
      byDepartment: generateCostBreakdown('department', timeframe || '30d', 5),
      byService: generateCostBreakdown('service', timeframe || '30d', 5)
    },
    recentActivity: [
      {
        type: 'anomaly',
        message: 'Cost spike detected in Engineering department',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        severity: 'medium'
      },
      {
        type: 'optimization',
        message: 'New rightsizing opportunity identified',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        severity: 'low'
      },
      {
        type: 'budget',
        message: 'Marketing department reached 75% of monthly budget',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        severity: 'medium'
      }
    ]
  };

  if (includeForecasts) {
    overview.forecast = {
      nextMonth: currentPeriodCost * 1.1,
      nextQuarter: currentPeriodCost * 3.2,
      confidence: 0.85,
      factors: ['Historical trends', 'Seasonal patterns', 'Planned deployments']
    };
  }

  if (includeRecommendations) {
    overview.topRecommendations = generateRecommendationsSummary(department, 3);
  }

  return overview;
}

function generateKeyMetrics(department?: string, timeframe?: string) {
  const baseCost = Math.random() * 50000 + 20000;
  
  return {
    totalSpend: {
      current: baseCost,
      previous: baseCost * 0.9,
      change: 10,
      trend: 'up'
    },
    averageDailyCost: {
      current: baseCost / getDaysInTimeframe(timeframe || '30d'),
      previous: (baseCost * 0.9) / getDaysInTimeframe(timeframe || '30d'),
      change: 10,
      trend: 'up'
    },
    costEfficiency: {
      current: 85.2,
      previous: 82.1,
      change: 3.1,
      trend: 'up'
    },
    budgetUtilization: {
      current: (baseCost / 60000) * 100,
      target: 80,
      status: baseCost / 60000 > 0.8 ? 'warning' : 'good'
    },
    savingsOpportunities: {
      count: Math.floor(Math.random() * 10) + 5,
      totalPotential: Math.random() * 5000 + 2000,
      implemented: Math.floor(Math.random() * 3) + 1
    },
    resourceUtilization: {
      compute: Math.random() * 40 + 60,
      storage: Math.random() * 30 + 70,
      network: Math.random() * 20 + 80
    }
  };
}

function generateCostTrends(department?: string, timeframe?: string, granularity?: string) {
  const days = getDaysInTimeframe(timeframe || '30d');
  const dataPoints = granularity === 'daily' ? days : Math.ceil(days / 7);
  
  const trends = [];
  const baseCost = Math.random() * 2000 + 1000;
  
  for (let i = 0; i < dataPoints; i++) {
    const date = new Date();
    if (granularity === 'daily') {
      date.setDate(date.getDate() - (dataPoints - i - 1));
    } else {
      date.setDate(date.getDate() - (dataPoints - i - 1) * 7);
    }
    
    trends.push({
      date: date.toISOString().split('T')[0],
      cost: baseCost + (Math.random() * 400 - 200) + (i * 10), // Slight upward trend
      budget: baseCost * 1.2,
      forecast: i > dataPoints * 0.8 ? baseCost + (Math.random() * 200 - 100) : null
    });
  }
  
  return {
    data: trends,
    summary: {
      totalCost: trends.reduce((sum, point) => sum + point.cost, 0),
      averageCost: trends.reduce((sum, point) => sum + point.cost, 0) / trends.length,
      trend: 'increasing',
      volatility: 'medium'
    }
  };
}

function generateCostBreakdown(dimension: string, timeframe?: string, limit?: number) {
  const items = [];
  const total = Math.random() * 50000 + 20000;
  
  let categories: string[] = [];
  
  switch (dimension) {
    case 'department':
      categories = ['Engineering', 'Marketing', 'Sales', 'Operations', 'Finance'];
      break;
    case 'service':
      categories = ['Virtual Machines', 'Storage', 'App Service', 'SQL Database', 'CDN'];
      break;
    case 'region':
      categories = ['East US', 'West US', 'Europe', 'Asia Pacific', 'Canada'];
      break;
    default:
      categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
  }
  
  let remainingTotal = total;
  
  for (let i = 0; i < Math.min(categories.length, limit || 10); i++) {
    const isLast = i === Math.min(categories.length, limit || 10) - 1;
    const cost = isLast ? remainingTotal : Math.random() * (remainingTotal * 0.4);
    remainingTotal -= cost;
    
    items.push({
      name: categories[i],
      cost,
      percentage: (cost / total) * 100,
      change: (Math.random() * 40 - 20), // -20% to +20%
      trend: Math.random() > 0.5 ? 'up' : 'down'
    });
  }
  
  return {
    items: items.sort((a, b) => b.cost - a.cost),
    total,
    dimension,
    timeframe
  };
}

function generateAlertsSummary(department?: string) {
  return {
    total: 12,
    active: 5,
    critical: 1,
    high: 2,
    medium: 6,
    low: 3,
    recent: [
      {
        id: 'alert-1',
        type: 'cost_threshold',
        severity: 'high',
        title: 'Monthly budget threshold exceeded',
        department: 'Engineering',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'alert-2',
        type: 'anomaly',
        severity: 'medium',
        title: 'Unusual spending pattern detected',
        department: 'Marketing',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ],
    trends: {
      thisWeek: 5,
      lastWeek: 8,
      change: -37.5
    }
  };
}

function generateRecommendationsSummary(department?: string, limit?: number) {
  const recommendations = [
    {
      id: 'rec-1',
      type: 'rightsizing',
      title: 'Rightsize Virtual Machines',
      potentialSavings: 1200,
      effort: 'medium',
      priority: 'high'
    },
    {
      id: 'rec-2',
      type: 'reserved_instances',
      title: 'Purchase Reserved Instances',
      potentialSavings: 2400,
      effort: 'low',
      priority: 'high'
    },
    {
      id: 'rec-3',
      type: 'storage_optimization',
      title: 'Optimize Storage Tiers',
      potentialSavings: 800,
      effort: 'low',
      priority: 'medium'
    },
    {
      id: 'rec-4',
      type: 'scheduled_shutdown',
      title: 'Implement Scheduled Shutdowns',
      potentialSavings: 1500,
      effort: 'medium',
      priority: 'medium'
    }
  ];
  
  return {
    recommendations: recommendations.slice(0, limit || recommendations.length),
    totalPotentialSavings: recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0),
    count: recommendations.length,
    implementationStatus: {
      pending: 3,
      inProgress: 1,
      completed: 0
    }
  };
}

function generateWidgetData(widgetId: string, department?: string, timeframe?: string) {
  switch (widgetId) {
    case 'cost-overview':
      return {
        totalCost: Math.random() * 50000 + 20000,
        change: Math.random() * 20 - 10,
        trend: Math.random() > 0.5 ? 'up' : 'down'
      };
    
    case 'budget-utilization':
      const utilization = Math.random() * 100;
      return {
        utilization,
        status: utilization > 90 ? 'critical' : utilization > 75 ? 'warning' : 'good',
        remaining: 60000 * (1 - utilization / 100)
      };
    
    case 'top-spenders':
      return generateCostBreakdown('department', timeframe, 5);
    
    case 'recent-anomalies':
      return {
        anomalies: [
          {
            date: new Date().toISOString().split('T')[0],
            type: 'spike',
            severity: 'medium',
            deviation: 2.3
          }
        ],
        count: 1
      };
    
    default:
      return null;
  }
}

function getDaysInTimeframe(timeframe: string): number {
  switch (timeframe) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    default: return 30;
  }
}