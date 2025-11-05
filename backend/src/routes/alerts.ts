import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DataPipelineService } from '../services/data-pipeline.js';
import { AIAnalysisService } from '../services/ai-analysis.js';
import { RealtimeService } from '../services/realtime.js';
import { validateRequest } from '../middleware/validation.js';

/**
 * Alerts API Routes
 * Handles cost alerts, anomaly notifications, and alert management
 */

const CreateAlertSchema = z.object({
  type: z.enum(['cost_threshold', 'anomaly', 'budget_exceeded', 'optimization_opportunity']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  threshold: z.number().optional(),
  department: z.string().optional(),
  conditions: z.record(z.any()).optional()
});

const UpdateAlertSchema = z.object({
  status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
  notes: z.string().max(500).optional()
});

const AlertFiltersSchema = z.object({
  status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  type: z.string().optional(),
  department: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

export function alertsRoutes(
  dataPipelineService: DataPipelineService,
  aiAnalysisService: AIAnalysisService,
  realtimeService: RealtimeService
): Router {
  const router = Router();

  /**
   * GET /api/alerts
   * Retrieve alerts with filtering and pagination
   */
  router.get('/', validateRequest(AlertFiltersSchema, 'query'), async (req: Request, res: Response) => {
    try {
      const { status, severity, type, department, limit, offset } = req.query as any;

      // In a real implementation, this would fetch from database
      const mockAlerts = generateMockAlerts(limit, offset, { status, severity, type, department });

      res.json({
        success: true,
        data: mockAlerts,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Alerts retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/alerts
   * Create a new alert
   */
  router.post('/', validateRequest(CreateAlertSchema, 'body'), async (req: Request, res: Response) => {
    try {
      const alertData = req.body;
      const userId = req.headers['x-user-id'] as string || 'system';

      // Create alert (in real implementation, this would save to database)
      const newAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...alertData,
        status: 'active' as const,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Broadcast alert to subscribed clients
      realtimeService.emit('alertCreated', newAlert);

      res.status(201).json({
        success: true,
        data: newAlert,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Alert creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/alerts/:id
   * Get specific alert details
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // In real implementation, fetch from database
      const alert = {
        id,
        type: 'cost_threshold',
        severity: 'high',
        title: 'Monthly budget threshold exceeded',
        description: 'Engineering department has exceeded 80% of monthly budget',
        status: 'active',
        department: 'engineering',
        threshold: 10000,
        currentValue: 8500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [
          {
            action: 'created',
            timestamp: new Date().toISOString(),
            userId: 'system',
            notes: 'Alert automatically generated'
          }
        ]
      };

      res.json({
        success: true,
        data: alert,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Alert retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PATCH /api/alerts/:id
   * Update alert status or add notes
   */
  router.patch('/:id', validateRequest(UpdateAlertSchema, 'body'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.headers['x-user-id'] as string || 'anonymous';

      // In real implementation, update in database
      const updatedAlert = {
        id,
        status: status || 'active',
        notes,
        updatedBy: userId,
        updatedAt: new Date().toISOString()
      };

      // Broadcast update to subscribed clients
      realtimeService.emit('alertUpdated', updatedAlert);

      res.json({
        success: true,
        data: updatedAlert,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Alert update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * DELETE /api/alerts/:id
   * Delete an alert
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string || 'anonymous';

      // In real implementation, soft delete in database
      const deletedAlert = {
        id,
        status: 'deleted',
        deletedBy: userId,
        deletedAt: new Date().toISOString()
      };

      // Broadcast deletion to subscribed clients
      realtimeService.emit('alertDeleted', deletedAlert);

      res.json({
        success: true,
        data: { message: 'Alert deleted successfully' },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Alert deletion error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/alerts/bulk-action
   * Perform bulk actions on multiple alerts
   */
  router.post('/bulk-action', async (req: Request, res: Response) => {
    try {
      const { alertIds, action, notes } = req.body;
      const userId = req.headers['x-user-id'] as string || 'anonymous';

      if (!Array.isArray(alertIds) || alertIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Alert IDs array is required'
        });
      }

      if (!['acknowledge', 'resolve', 'delete'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Must be acknowledge, resolve, or delete'
        });
      }

      // In real implementation, update multiple alerts in database
      const results = alertIds.map((id: string) => ({
        id,
        action,
        status: action === 'acknowledge' ? 'acknowledged' : action === 'resolve' ? 'resolved' : 'deleted',
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
        notes
      }));

      // Broadcast bulk update
      realtimeService.emit('alertsBulkUpdated', { action, alertIds, userId });

      res.json({
        success: true,
        data: {
          processedCount: results.length,
          results
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Bulk alert action error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk action',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/alerts/summary
   * Get alert summary and statistics
   */
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const { department, timeframe = '7d' } = req.query;

      // In real implementation, calculate from database
      const summary = {
        total: 25,
        active: 8,
        acknowledged: 12,
        resolved: 5,
        bySeverity: {
          critical: 2,
          high: 6,
          medium: 12,
          low: 5
        },
        byType: {
          cost_threshold: 10,
          anomaly: 8,
          budget_exceeded: 4,
          optimization_opportunity: 3
        },
        byDepartment: department ? {
          [department]: 15,
          other: 10
        } : {
          engineering: 12,
          marketing: 8,
          sales: 3,
          operations: 2
        },
        trends: {
          thisWeek: 8,
          lastWeek: 12,
          change: -33.3
        },
        averageResolutionTime: '4.2 hours',
        timeframe,
        generatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Alert summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate alert summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/alerts/test-anomaly-detection
   * Trigger anomaly detection for testing
   */
  router.post('/test-anomaly-detection', async (req: Request, res: Response) => {
    try {
      const { department, threshold = 2.0, days = 30 } = req.body;

      // Trigger anomaly detection
      await dataPipelineService.detectAnomalies({
        days,
        threshold,
        departments: department ? [department] : undefined
      });

      res.json({
        success: true,
        data: {
          message: 'Anomaly detection triggered successfully',
          parameters: { department, threshold, days }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Test anomaly detection error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger anomaly detection',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/alerts/rules
   * Get alert rules and thresholds
   */
  router.get('/rules', async (req: Request, res: Response) => {
    try {
      // In real implementation, fetch from database
      const alertRules = [
        {
          id: 'rule-1',
          name: 'Monthly Budget Threshold',
          type: 'cost_threshold',
          conditions: {
            threshold: 10000,
            period: 'monthly',
            comparison: 'greater_than'
          },
          severity: 'high',
          enabled: true,
          department: 'engineering',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'rule-2',
          name: 'Daily Anomaly Detection',
          type: 'anomaly',
          conditions: {
            threshold: 2.0,
            period: 'daily',
            lookback: 30
          },
          severity: 'medium',
          enabled: true,
          department: null,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];

      res.json({
        success: true,
        data: {
          rules: alertRules,
          count: alertRules.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Alert rules error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert rules',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

// Helper function to generate mock alerts
function generateMockAlerts(limit: number, offset: number, filters: any) {
  const types = ['cost_threshold', 'anomaly', 'budget_exceeded', 'optimization_opportunity'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['active', 'acknowledged', 'resolved'];
  const departments = ['engineering', 'marketing', 'sales', 'operations'];

  const alerts = [];
  
  for (let i = 0; i < limit; i++) {
    const alertIndex = i + offset;
    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() - (alertIndex * 2));

    const alert = {
      id: `alert-${alertIndex}`,
      type: filters.type || types[alertIndex % types.length],
      severity: filters.severity || severities[alertIndex % severities.length],
      status: filters.status || statuses[alertIndex % statuses.length],
      title: `Alert ${alertIndex + 1}: ${getAlertTitle(types[alertIndex % types.length])}`,
      description: getAlertDescription(types[alertIndex % types.length]),
      department: filters.department || departments[alertIndex % departments.length],
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      data: {
        threshold: 1000 + (alertIndex * 100),
        currentValue: 1200 + (alertIndex * 150),
        deviation: alertIndex * 0.1 + 1.5
      }
    };

    alerts.push(alert);
  }

  return {
    alerts,
    pagination: {
      total: 100, // Mock total
      limit,
      offset,
      hasMore: offset + limit < 100
    },
    summary: {
      totalActive: alerts.filter(a => a.status === 'active').length,
      totalCritical: alerts.filter(a => a.severity === 'critical').length,
      totalHigh: alerts.filter(a => a.severity === 'high').length
    }
  };
}

function getAlertTitle(type: string): string {
  switch (type) {
    case 'cost_threshold':
      return 'Cost threshold exceeded';
    case 'anomaly':
      return 'Cost anomaly detected';
    case 'budget_exceeded':
      return 'Budget limit exceeded';
    case 'optimization_opportunity':
      return 'Optimization opportunity identified';
    default:
      return 'Cost alert';
  }
}

function getAlertDescription(type: string): string {
  switch (type) {
    case 'cost_threshold':
      return 'Monthly spending has exceeded the configured threshold';
    case 'anomaly':
      return 'Unusual spending pattern detected that deviates from normal behavior';
    case 'budget_exceeded':
      return 'Department budget has been exceeded for the current period';
    case 'optimization_opportunity':
      return 'Potential cost savings opportunity has been identified';
    default:
      return 'Cost-related alert requiring attention';
  }
}