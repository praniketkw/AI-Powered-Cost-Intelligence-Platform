import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AIAnalysisService } from '../services/ai-analysis.js';
import { MCPIntegrationService } from '../services/mcp-integration.js';
import { CacheService } from '../services/cache.js';
import { validateRequest } from '../middleware/validation.js';

/**
 * Optimization API Routes
 * Handles cost optimization recommendations and rightsizing analysis
 */

const OptimizationRequestSchema = z.object({
  department: z.string().optional(),
  minSavings: z.number().min(0).default(100),
  riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
  timeframe: z.enum(['1 month', '3 months', '6 months', '1 year']).default('3 months')
});

const RightsizingRequestSchema = z.object({
  utilizationThreshold: z.number().min(1).max(100).default(20),
  department: z.string().optional(),
  resourceType: z.string().optional()
});

const RecommendationActionSchema = z.object({
  recommendationId: z.string(),
  action: z.enum(['accept', 'dismiss', 'defer']),
  notes: z.string().optional()
});

export function optimizationRoutes(
  aiAnalysisService: AIAnalysisService,
  mcpIntegrationService: MCPIntegrationService,
  cacheService: CacheService
): Router {
  const router = Router();

  /**
   * POST /api/optimization/recommendations
   * Generate AI-powered cost optimization recommendations
   */
  router.post('/recommendations', validateRequest(OptimizationRequestSchema, 'body'), async (req: Request, res: Response) => {
    try {
      const { department, minSavings, riskTolerance, timeframe } = req.body;
      const userId = req.headers['x-user-id'] as string || 'system';
      const organizationId = req.headers['x-organization-id'] as string || 'default';

      const cacheKey = `optimization:${department || 'all'}:${minSavings}:${riskTolerance}:${timeframe}`;
      
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

      // Get optimization recommendations from MCP server
      const mcpResponse = await mcpIntegrationService.getOptimizationRecommendations({
        department,
        minSavings
      });

      if (!mcpResponse.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch optimization recommendations',
          details: mcpResponse.error
        });
      }

      // Enhance recommendations with AI analysis
      const costData = await fetchRecentCostData(department);
      const aiRecommendations = await aiAnalysisService.generateOptimizationRecommendations(
        costData,
        {
          department,
          minSavings,
          riskTolerance,
          userId,
          organizationId
        }
      );

      // Combine MCP and AI recommendations
      const combinedRecommendations = {
        mcpRecommendations: mcpResponse.data?.recommendations || [],
        aiRecommendations: aiRecommendations.data?.recommendations || [],
        summary: {
          totalRecommendations: (mcpResponse.data?.recommendations?.length || 0) + (aiRecommendations.data?.recommendations?.length || 0),
          totalPotentialSavings: (mcpResponse.data?.totalPotentialSavings || 0) + (aiRecommendations.data?.totalSavings || 0),
          riskProfile: riskTolerance,
          timeframe,
          generatedAt: new Date().toISOString()
        },
        insights: aiRecommendations.insights || [],
        confidence: aiRecommendations.confidence || 0
      };

      // Cache the result
      await cacheService.setAnalysisResult(cacheKey, {
        ...combinedRecommendations,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        data: combinedRecommendations,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Optimization recommendations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate optimization recommendations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/optimization/rightsizing
   * Analyze resources for rightsizing opportunities
   */
  router.post('/rightsizing', validateRequest(RightsizingRequestSchema, 'body'), async (req: Request, res: Response) => {
    try {
      const { utilizationThreshold, department, resourceType } = req.body;

      const cacheKey = `rightsizing:${utilizationThreshold}:${department || 'all'}:${resourceType || 'all'}`;
      
      // Check cache
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult && Date.now() - new Date(cachedResult.timestamp).getTime() < 1800000) { // 30 minutes
        return res.json({
          success: true,
          data: cachedResult,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Get rightsizing data from MCP server
      const mcpResponse = await mcpIntegrationService.getResourceRightsizing({
        utilizationThreshold
      });

      if (!mcpResponse.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch rightsizing data',
          details: mcpResponse.error
        });
      }

      // Filter by department and resource type if specified
      let opportunities = mcpResponse.data?.opportunities || [];
      
      if (department) {
        opportunities = opportunities.filter((opp: any) => 
          opp.resourceId.toLowerCase().includes(department.toLowerCase())
        );
      }
      
      if (resourceType) {
        opportunities = opportunities.filter((opp: any) => 
          opp.resourceType.toLowerCase().includes(resourceType.toLowerCase())
        );
      }

      // Enhance with additional analysis
      const enhancedOpportunities = opportunities.map((opp: any) => ({
        ...opp,
        priority: calculatePriority(opp.monthlySavings, opp.confidence, opp.currentUtilization),
        riskAssessment: assessRightsizingRisk(opp),
        implementationSteps: generateImplementationSteps(opp),
        estimatedEffort: estimateImplementationEffort(opp)
      }));

      const result = {
        opportunities: enhancedOpportunities,
        summary: {
          totalOpportunities: enhancedOpportunities.length,
          potentialMonthlySavings: enhancedOpportunities.reduce((sum: number, opp: any) => sum + opp.monthlySavings, 0),
          potentialAnnualSavings: enhancedOpportunities.reduce((sum: number, opp: any) => sum + opp.monthlySavings * 12, 0),
          averageUtilization: enhancedOpportunities.length > 0 
            ? enhancedOpportunities.reduce((sum: number, opp: any) => sum + opp.currentUtilization, 0) / enhancedOpportunities.length 
            : 0,
          utilizationThreshold,
          analysisDate: new Date().toISOString()
        },
        recommendations: generateRightsizingRecommendations(enhancedOpportunities)
      };

      // Cache the result
      await cacheService.set(cacheKey, {
        ...result,
        timestamp: new Date().toISOString()
      }, { ttl: 1800 });

      res.json({
        success: true,
        data: result,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Rightsizing analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze rightsizing opportunities',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/optimization/savings-potential
   * Calculate total savings potential across all optimization opportunities
   */
  router.get('/savings-potential', async (req: Request, res: Response) => {
    try {
      const { department, timeframe = '1 year' } = req.query;

      const cacheKey = `savings-potential:${department || 'all'}:${timeframe}`;
      
      // Check cache
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult && Date.now() - new Date(cachedResult.timestamp).getTime() < 3600000) { // 1 hour
        return res.json({
          success: true,
          data: cachedResult,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Get data from multiple sources
      const [optimizationResponse, rightsizingResponse] = await Promise.all([
        mcpIntegrationService.getOptimizationRecommendations({ department: department as string }),
        mcpIntegrationService.getResourceRightsizing({ utilizationThreshold: 20 })
      ]);

      const timeMultiplier = getTimeMultiplier(timeframe as string);

      const savingsPotential = {
        optimization: {
          monthlySavings: optimizationResponse.data?.totalPotentialSavings || 0,
          projectedSavings: (optimizationResponse.data?.totalPotentialSavings || 0) * timeMultiplier,
          recommendationCount: optimizationResponse.data?.recommendationCount || 0
        },
        rightsizing: {
          monthlySavings: rightsizingResponse.data?.potentialMonthlySavings || 0,
          projectedSavings: (rightsizingResponse.data?.potentialMonthlySavings || 0) * timeMultiplier,
          opportunityCount: rightsizingResponse.data?.totalOpportunities || 0
        },
        total: {
          monthlySavings: (optimizationResponse.data?.totalPotentialSavings || 0) + (rightsizingResponse.data?.potentialMonthlySavings || 0),
          projectedSavings: ((optimizationResponse.data?.totalPotentialSavings || 0) + (rightsizingResponse.data?.potentialMonthlySavings || 0)) * timeMultiplier,
          totalOpportunities: (optimizationResponse.data?.recommendationCount || 0) + (rightsizingResponse.data?.totalOpportunities || 0)
        },
        breakdown: {
          reservedInstances: Math.random() * 5000 + 2000, // Mock data
          rightsizing: rightsizingResponse.data?.potentialMonthlySavings || 0,
          storageOptimization: Math.random() * 1000 + 500,
          scheduledShutdown: Math.random() * 2000 + 1000,
          other: Math.random() * 1000 + 300
        },
        timeframe,
        department: department || 'all',
        analysisDate: new Date().toISOString()
      };

      // Cache the result
      await cacheService.set(cacheKey, {
        ...savingsPotential,
        timestamp: new Date().toISOString()
      }, { ttl: 3600 });

      res.json({
        success: true,
        data: savingsPotential,
        cached: false,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Savings potential error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate savings potential',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/optimization/recommendations/:id/action
   * Take action on a specific recommendation
   */
  router.post('/recommendations/:id/action', validateRequest(RecommendationActionSchema, 'body'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action, notes } = req.body;
      const userId = req.headers['x-user-id'] as string || 'anonymous';

      // In a real implementation, this would update the recommendation status in the database
      const actionResult = {
        recommendationId: id,
        action,
        notes,
        userId,
        timestamp: new Date().toISOString(),
        status: 'processed'
      };

      // Invalidate related caches
      await cacheService.deletePattern('optimization:*');
      await cacheService.deletePattern('savings-potential:*');

      res.json({
        success: true,
        data: actionResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Recommendation action error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process recommendation action',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/optimization/history
   * Get optimization history and implemented recommendations
   */
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const { department, limit = 50, offset = 0 } = req.query;

      // In a real implementation, this would fetch from database
      const mockHistory = generateOptimizationHistory(
        parseInt(limit as string),
        parseInt(offset as string),
        department as string
      );

      res.json({
        success: true,
        data: mockHistory,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Optimization history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch optimization history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

// Helper functions
async function fetchRecentCostData(department?: string): Promise<any[]> {
  // Mock cost data for AI analysis
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return generateMockCostData(startDate, endDate, department);
}

function generateMockCostData(startDate: string, endDate: string, department?: string): any[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  const data = [];
  const departments = department ? [department] : ['engineering', 'marketing', 'sales'];
  const services = ['Virtual Machines', 'Storage', 'App Service'];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    for (const dept of departments) {
      for (const service of services) {
        data.push({
          id: `cost-${date.toISOString().split('T')[0]}-${dept}-${service}`,
          date: date.toISOString().split('T')[0],
          cost: Math.random() * 500 + 50,
          department: dept,
          serviceName: service,
          resourceGroup: `rg-${dept}`
        });
      }
    }
  }
  
  return data;
}

function calculatePriority(savings: number, confidence: string, utilization: number): 'high' | 'medium' | 'low' {
  const confidenceScore = confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1;
  const utilizationScore = utilization < 10 ? 3 : utilization < 25 ? 2 : 1;
  const savingsScore = savings > 1000 ? 3 : savings > 500 ? 2 : 1;
  
  const totalScore = confidenceScore + utilizationScore + savingsScore;
  
  if (totalScore >= 8) return 'high';
  if (totalScore >= 6) return 'medium';
  return 'low';
}

function assessRightsizingRisk(opportunity: any): { level: string; factors: string[] } {
  const factors = [];
  let riskLevel = 'low';
  
  if (opportunity.currentUtilization > 50) {
    factors.push('High current utilization may indicate resource is needed');
    riskLevel = 'medium';
  }
  
  if (opportunity.resourceType.includes('Database')) {
    factors.push('Database rightsizing requires careful performance monitoring');
    riskLevel = 'medium';
  }
  
  if (opportunity.monthlySavings > 2000) {
    factors.push('High savings potential - verify business impact');
    if (riskLevel === 'low') riskLevel = 'medium';
  }
  
  return { level: riskLevel, factors };
}

function generateImplementationSteps(opportunity: any): string[] {
  const steps = [
    'Review current resource utilization patterns',
    'Identify peak usage periods and requirements',
    'Test performance with reduced resource allocation in non-production environment'
  ];
  
  if (opportunity.resourceType.includes('Virtual Machine')) {
    steps.push('Schedule maintenance window for VM resize');
    steps.push('Update monitoring thresholds for new VM size');
  }
  
  if (opportunity.resourceType.includes('Database')) {
    steps.push('Backup database before making changes');
    steps.push('Monitor query performance after resize');
  }
  
  steps.push('Monitor resource performance for 1-2 weeks after implementation');
  steps.push('Document changes and update capacity planning');
  
  return steps;
}

function estimateImplementationEffort(opportunity: any): { hours: number; complexity: string } {
  let hours = 2; // Base effort
  let complexity = 'low';
  
  if (opportunity.resourceType.includes('Database')) {
    hours += 4;
    complexity = 'medium';
  }
  
  if (opportunity.resourceType.includes('Virtual Machine')) {
    hours += 2;
  }
  
  if (opportunity.monthlySavings > 1000) {
    hours += 2; // More testing required for high-impact changes
    if (complexity === 'low') complexity = 'medium';
  }
  
  return { hours, complexity };
}

function generateRightsizingRecommendations(opportunities: any[]): string[] {
  const recommendations = [];
  
  if (opportunities.length === 0) {
    return ['No rightsizing opportunities found with current thresholds'];
  }
  
  const highPriorityCount = opportunities.filter(opp => opp.priority === 'high').length;
  const totalSavings = opportunities.reduce((sum, opp) => sum + opp.monthlySavings, 0);
  
  if (highPriorityCount > 0) {
    recommendations.push(`Focus on ${highPriorityCount} high-priority opportunities first for maximum impact`);
  }
  
  if (totalSavings > 5000) {
    recommendations.push('Significant savings potential identified - consider phased implementation approach');
  }
  
  const vmOpportunities = opportunities.filter(opp => opp.resourceType.includes('Virtual Machine'));
  if (vmOpportunities.length > 0) {
    recommendations.push(`${vmOpportunities.length} VM rightsizing opportunities - consider implementing during maintenance windows`);
  }
  
  recommendations.push('Monitor performance closely after implementing rightsizing changes');
  recommendations.push('Consider setting up automated alerts for resource utilization');
  
  return recommendations;
}

function getTimeMultiplier(timeframe: string): number {
  switch (timeframe) {
    case '1 month': return 1;
    case '3 months': return 3;
    case '6 months': return 6;
    case '1 year': return 12;
    default: return 12;
  }
}

function generateOptimizationHistory(limit: number, offset: number, department?: string): any {
  const history = [];
  
  for (let i = 0; i < limit; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (i + offset));
    
    history.push({
      id: `opt-${i + offset}`,
      type: ['rightsizing', 'reserved_instances', 'storage_optimization'][Math.floor(Math.random() * 3)],
      title: `Optimization ${i + offset + 1}`,
      department: department || ['engineering', 'marketing', 'sales'][Math.floor(Math.random() * 3)],
      status: ['implemented', 'in_progress', 'dismissed'][Math.floor(Math.random() * 3)],
      monthlySavings: Math.random() * 1000 + 100,
      implementedAt: date.toISOString(),
      implementedBy: 'system'
    });
  }
  
  return {
    history,
    pagination: {
      total: 100, // Mock total
      limit,
      offset,
      hasMore: offset + limit < 100
    }
  };
}