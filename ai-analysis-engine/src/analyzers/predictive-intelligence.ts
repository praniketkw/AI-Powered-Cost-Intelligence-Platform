import { AIAnalysisEngine, AnalysisResponse } from '../core/analysis-engine.js';
import { BusinessEvent } from './correlation-engine.js';

/**
 * Predictive Intelligence Engine
 * Provides 2-4 hour early warning for cost issues before they impact budgets
 * Solves the enterprise problem of reactive cost discovery
 */

export interface CostPrediction {
  timeframe: '2h' | '4h' | '8h' | '24h' | '7d' | '30d';
  predictedCost: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    factor: string;
    impact: number; // Dollar impact
    confidence: number;
  }>;
}

export interface BudgetAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  predictedBudgetBurn: number;
  timeToExceedBudget: string; // "2 hours", "3 days", etc.
  affectedDepartments: string[];
  suggestedActions: string[];
  preventionStrategies: string[];
  businessImpact: {
    revenueAtRisk: number;
    customersAffected: number;
    servicesAtRisk: string[];
  };
}

export interface ScenarioAnalysis {
  scenario: string;
  probability: number;
  costImpact: number;
  timeframe: string;
  triggerEvents: string[];
  mitigationStrategies: string[];
}

export class PredictiveIntelligence {
  private analysisEngine: AIAnalysisEngine;
  private predictionHistory: Map<string, CostPrediction[]> = new Map();
  private alertHistory: BudgetAlert[] = [];

  constructor(analysisEngine: AIAnalysisEngine) {
    this.analysisEngine = analysisEngine;
  }

  /**
   * Generate cost predictions with early warning capabilities
   */
  async generateCostPredictions(
    historicalCostData: any[],
    currentTrends: any[],
    upcomingEvents: BusinessEvent[],
    budgetConstraints: { daily: number; monthly: number; quarterly: number }
  ): Promise<{
    predictions: CostPrediction[];
    budgetAlerts: BudgetAlert[];
    scenarios: ScenarioAnalysis[];
  }> {
    // Generate predictions for different timeframes
    const predictions = await Promise.all([
      this.predictCostForTimeframe(historicalCostData, currentTrends, '2h'),
      this.predictCostForTimeframe(historicalCostData, currentTrends, '4h'),
      this.predictCostForTimeframe(historicalCostData, currentTrends, '24h'),
      this.predictCostForTimeframe(historicalCostData, currentTrends, '7d'),
      this.predictCostForTimeframe(historicalCostData, currentTrends, '30d')
    ]);

    // Generate budget alerts based on predictions
    const budgetAlerts = await this.generateBudgetAlerts(predictions, budgetConstraints, upcomingEvents);

    // Generate scenario analysis
    const scenarios = await this.generateScenarioAnalysis(historicalCostData, upcomingEvents);

    // Store predictions for accuracy tracking
    this.storePredictions(predictions);

    return {
      predictions,
      budgetAlerts,
      scenarios
    };
  }

  /**
   * Predict cost impact of specific events before they happen
   */
  async predictEventImpact(
    event: BusinessEvent,
    historicalCostData: any[],
    currentBaseline: number
  ): Promise<{
    predictedImpact: number;
    confidence: number;
    timeToImpact: string;
    peakImpactTime: string;
    recoveryTime: string;
    riskFactors: string[];
    mitigationStrategies: string[];
  }> {
    // Analyze similar historical events
    const similarEvents = this.findSimilarEvents(event, historicalCostData);
    
    // Use AI to predict impact
    const aiResponse = await this.analysisEngine.analyze({
      type: 'forecasting',
      data: {
        targetEvent: event,
        similarEvents,
        currentBaseline,
        historicalPatterns: this.extractEventPatterns(similarEvents)
      },
      options: { focus: 'event_impact_prediction' }
    });

    return {
      predictedImpact: aiResponse.data?.predictedImpact || 0,
      confidence: aiResponse.confidence,
      timeToImpact: aiResponse.data?.timeToImpact || '30 minutes',
      peakImpactTime: aiResponse.data?.peakImpactTime || '2 hours',
      recoveryTime: aiResponse.data?.recoveryTime || '4 hours',
      riskFactors: aiResponse.data?.riskFactors || [],
      mitigationStrategies: aiResponse.insights
    };
  }

  /**
   * Generate proactive budget protection alerts
   */
  async generateProactiveBudgetProtection(
    currentSpend: number,
    predictions: CostPrediction[],
    budgetLimits: { daily: number; monthly: number },
    businessContext: {
      criticalServices: string[];
      peakBusinessHours: string[];
      maintenanceWindows: string[];
    }
  ): Promise<{
    immediateActions: string[];
    preventiveActions: string[];
    escalationPlan: string[];
    businessImpactAssessment: string;
  }> {
    const nearTermPrediction = predictions.find(p => p.timeframe === '4h');
    const dailyPrediction = predictions.find(p => p.timeframe === '24h');

    if (!nearTermPrediction || !dailyPrediction) {
      throw new Error('Required predictions not available');
    }

    // Calculate budget burn rate and risk
    const currentBurnRate = currentSpend / (new Date().getHours() + 1); // Hourly rate
    const projectedDailySpend = currentSpend + nearTermPrediction.predictedCost;
    const budgetRisk = projectedDailySpend / budgetLimits.daily;

    const aiResponse = await this.analysisEngine.analyze({
      type: 'optimization',
      data: {
        currentSpend,
        predictions: [nearTermPrediction, dailyPrediction],
        budgetRisk,
        businessContext
      },
      options: { focus: 'proactive_budget_protection' }
    });

    return {
      immediateActions: aiResponse.data?.immediateActions || [],
      preventiveActions: aiResponse.data?.preventiveActions || [],
      escalationPlan: aiResponse.data?.escalationPlan || [],
      businessImpactAssessment: aiResponse.data?.businessImpact || 'Low impact expected'
    };
  }

  /**
   * Analyze cost anomalies before they become critical
   */
  async detectEarlyAnomalies(
    realtimeCostData: any[],
    historicalBaseline: any[],
    sensitivityLevel: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<Array<{
    anomalyType: 'spike' | 'drift' | 'pattern_break' | 'efficiency_drop';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    predictedImpact: number;
    timeToBecomeCritical: string;
    rootCauseHypotheses: string[];
    recommendedActions: string[];
    confidence: number;
  }>> {
    const anomalies = [];
    
    // Statistical anomaly detection
    const statisticalAnomalies = this.detectStatisticalAnomalies(realtimeCostData, historicalBaseline, sensitivityLevel);
    
    // Pattern-based anomaly detection
    const patternAnomalies = this.detectPatternAnomalies(realtimeCostData, historicalBaseline);
    
    // Use AI to analyze and explain anomalies
    for (const anomaly of [...statisticalAnomalies, ...patternAnomalies]) {
      const aiResponse = await this.analysisEngine.analyze({
        type: 'anomaly_detection',
        data: {
          anomaly,
          recentData: realtimeCostData.slice(-50), // Last 50 data points
          baseline: historicalBaseline
        },
        options: { focus: 'early_anomaly_analysis' }
      });

      anomalies.push({
        anomalyType: anomaly.type,
        severity: this.calculateAnomalySeverity(anomaly, aiResponse),
        description: aiResponse.data?.description || anomaly.description,
        predictedImpact: aiResponse.data?.predictedImpact || 0,
        timeToBecomeCritical: aiResponse.data?.timeToBecomeCritical || 'Unknown',
        rootCauseHypotheses: aiResponse.data?.rootCauseHypotheses || [],
        recommendedActions: aiResponse.insights,
        confidence: aiResponse.confidence
      });
    }

    return anomalies.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
  }

  /**
   * Generate intelligent cost forecasts with business context
   */
  async generateIntelligentForecasts(
    historicalData: any[],
    businessCalendar: Array<{
      date: string;
      eventType: 'product_launch' | 'marketing_campaign' | 'seasonal_peak' | 'maintenance';
      expectedImpact: 'low' | 'medium' | 'high';
    }>,
    growthProjections: {
      userGrowthRate: number;
      revenueGrowthRate: number;
      featureReleaseSchedule: string[];
    }
  ): Promise<{
    forecasts: Array<{
      period: string;
      predictedCost: number;
      confidence: number;
      factors: string[];
    }>;
    businessAlignedInsights: string[];
    budgetRecommendations: {
      recommendedBudget: number;
      bufferPercentage: number;
      riskMitigation: string[];
    };
  }> {
    const aiResponse = await this.analysisEngine.analyze({
      type: 'forecasting',
      data: {
        historicalData: historicalData.slice(-90), // Last 90 days
        businessCalendar,
        growthProjections
      },
      options: { focus: 'business_aligned_forecasting' }
    });

    const forecasts = aiResponse.data?.forecasts || [];
    const businessAlignedInsights = aiResponse.insights;
    
    // Calculate recommended budget with buffer
    const avgForecast = forecasts.reduce((sum: number, f: any) => sum + f.predictedCost, 0) / forecasts.length;
    const recommendedBuffer = this.calculateRecommendedBuffer(forecasts, businessCalendar);

    return {
      forecasts,
      businessAlignedInsights,
      budgetRecommendations: {
        recommendedBudget: Math.round(avgForecast * (1 + recommendedBuffer)),
        bufferPercentage: Math.round(recommendedBuffer * 100),
        riskMitigation: aiResponse.data?.riskMitigation || []
      }
    };
  }

  private async predictCostForTimeframe(
    historicalData: any[],
    currentTrends: any[],
    timeframe: CostPrediction['timeframe']
  ): Promise<CostPrediction> {
    const aiResponse = await this.analysisEngine.analyze({
      type: 'forecasting',
      data: {
        historicalData: historicalData.slice(-100), // Last 100 data points
        currentTrends,
        timeframe
      },
      options: { focus: 'cost_prediction' }
    });

    const predictedCost = aiResponse.data?.predictedCost || 0;
    const trend = this.determineTrend(currentTrends);
    const riskLevel = this.calculateRiskLevel(predictedCost, timeframe, trend);

    return {
      timeframe,
      predictedCost: Math.round(predictedCost * 100) / 100,
      confidence: aiResponse.confidence,
      trend,
      riskLevel,
      factors: aiResponse.data?.factors || []
    };
  }

  private async generateBudgetAlerts(
    predictions: CostPrediction[],
    budgetConstraints: { daily: number; monthly: number; quarterly: number },
    upcomingEvents: BusinessEvent[]
  ): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];

    // Check daily budget risk
    const dailyPrediction = predictions.find(p => p.timeframe === '24h');
    if (dailyPrediction && dailyPrediction.predictedCost > budgetConstraints.daily * 0.8) {
      alerts.push({
        id: `daily-budget-risk-${Date.now()}`,
        severity: dailyPrediction.predictedCost > budgetConstraints.daily ? 'critical' : 'warning',
        title: 'Daily Budget Risk Detected',
        description: `Predicted daily spend ($${dailyPrediction.predictedCost}) may exceed budget ($${budgetConstraints.daily})`,
        predictedBudgetBurn: (dailyPrediction.predictedCost / budgetConstraints.daily) * 100,
        timeToExceedBudget: dailyPrediction.predictedCost > budgetConstraints.daily ? '< 24 hours' : '24-48 hours',
        affectedDepartments: this.extractAffectedDepartments(dailyPrediction.factors),
        suggestedActions: [
          'Review high-cost resources scheduled for today',
          'Consider delaying non-critical deployments',
          'Implement temporary cost controls'
        ],
        preventionStrategies: [
          'Set up automated scaling limits',
          'Implement budget-aware deployment policies',
          'Create cost approval workflows for large changes'
        ],
        businessImpact: {
          revenueAtRisk: 0,
          customersAffected: 0,
          servicesAtRisk: []
        }
      });
    }

    // Check monthly budget risk
    const monthlyPrediction = predictions.find(p => p.timeframe === '30d');
    if (monthlyPrediction && monthlyPrediction.predictedCost > budgetConstraints.monthly * 0.9) {
      alerts.push({
        id: `monthly-budget-risk-${Date.now()}`,
        severity: 'warning',
        title: 'Monthly Budget Projection Alert',
        description: `Projected monthly spend ($${monthlyPrediction.predictedCost}) approaching budget limit ($${budgetConstraints.monthly})`,
        predictedBudgetBurn: (monthlyPrediction.predictedCost / budgetConstraints.monthly) * 100,
        timeToExceedBudget: 'End of month',
        affectedDepartments: this.extractAffectedDepartments(monthlyPrediction.factors),
        suggestedActions: [
          'Review monthly spending patterns',
          'Identify optimization opportunities',
          'Plan cost reduction initiatives'
        ],
        preventionStrategies: [
          'Implement monthly budget checkpoints',
          'Create department-level budget tracking',
          'Establish cost optimization KPIs'
        ],
        businessImpact: {
          revenueAtRisk: 0,
          customersAffected: 0,
          servicesAtRisk: []
        }
      });
    }

    return alerts;
  }

  private async generateScenarioAnalysis(
    historicalData: any[],
    upcomingEvents: BusinessEvent[]
  ): Promise<ScenarioAnalysis[]> {
    const scenarios: ScenarioAnalysis[] = [];

    // High-impact event scenario
    const highImpactEvents = upcomingEvents.filter(e => 
      e.metadata.severity === 'high' || e.metadata.severity === 'critical'
    );

    if (highImpactEvents.length > 0) {
      scenarios.push({
        scenario: 'High-Impact Event Cluster',
        probability: 0.3,
        costImpact: this.estimateEventClusterImpact(highImpactEvents),
        timeframe: '24-48 hours',
        triggerEvents: highImpactEvents.map(e => e.title),
        mitigationStrategies: [
          'Pre-position additional capacity',
          'Prepare rollback procedures',
          'Set up enhanced monitoring'
        ]
      });
    }

    // Seasonal scaling scenario
    scenarios.push({
      scenario: 'Seasonal Traffic Increase',
      probability: 0.6,
      costImpact: this.estimateSeasonalImpact(historicalData),
      timeframe: '7-14 days',
      triggerEvents: ['Increased user activity', 'Marketing campaigns', 'Product launches'],
      mitigationStrategies: [
        'Implement auto-scaling policies',
        'Pre-purchase reserved capacity',
        'Optimize resource allocation'
      ]
    });

    return scenarios;
  }

  private findSimilarEvents(targetEvent: BusinessEvent, historicalData: any[]): BusinessEvent[] {
    // Simulate finding similar events based on type and metadata
    return []; // In real implementation, would search historical events
  }

  private extractEventPatterns(events: BusinessEvent[]): any {
    // Analyze patterns in historical events
    return {
      averageImpact: 0,
      typicalDuration: '2 hours',
      commonFactors: []
    };
  }

  private detectStatisticalAnomalies(realtimeData: any[], baseline: any[], sensitivity: string): any[] {
    // Implement statistical anomaly detection (Z-score, IQR, etc.)
    return [];
  }

  private detectPatternAnomalies(realtimeData: any[], baseline: any[]): any[] {
    // Implement pattern-based anomaly detection
    return [];
  }

  private calculateAnomalySeverity(anomaly: any, aiResponse: AnalysisResponse): 'low' | 'medium' | 'high' | 'critical' {
    const impact = aiResponse.data?.predictedImpact || 0;
    if (impact > 10000) return 'critical';
    if (impact > 5000) return 'high';
    if (impact > 1000) return 'medium';
    return 'low';
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private determineTrend(currentTrends: any[]): 'increasing' | 'decreasing' | 'stable' {
    // Analyze current trends to determine direction
    return 'stable'; // Simplified implementation
  }

  private calculateRiskLevel(predictedCost: number, timeframe: string, trend: string): 'low' | 'medium' | 'high' | 'critical' {
    // Calculate risk based on cost, timeframe, and trend
    if (predictedCost > 50000 && trend === 'increasing') return 'critical';
    if (predictedCost > 25000) return 'high';
    if (predictedCost > 10000) return 'medium';
    return 'low';
  }

  private extractAffectedDepartments(factors: any[]): string[] {
    // Extract department names from prediction factors
    return ['Core Platform', 'Data & ML']; // Simplified
  }

  private estimateEventClusterImpact(events: BusinessEvent[]): number {
    // Estimate cost impact of multiple events occurring together
    return events.length * 5000; // Simplified calculation
  }

  private estimateSeasonalImpact(historicalData: any[]): number {
    // Analyze historical seasonal patterns
    return 15000; // Simplified calculation
  }

  private calculateRecommendedBuffer(forecasts: any[], businessCalendar: any[]): number {
    // Calculate recommended budget buffer based on forecast uncertainty and business events
    const highImpactEvents = businessCalendar.filter(e => e.expectedImpact === 'high').length;
    const baseBuffer = 0.15; // 15% base buffer
    const eventBuffer = highImpactEvents * 0.05; // 5% per high-impact event
    return Math.min(0.5, baseBuffer + eventBuffer); // Cap at 50%
  }

  private storePredictions(predictions: CostPrediction[]): void {
    const key = new Date().toISOString().split('T')[0];
    this.predictionHistory.set(key, predictions);
    
    // Clean up old predictions (keep last 30 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    this.predictionHistory.forEach((_, date) => {
      if (new Date(date) < cutoffDate) {
        this.predictionHistory.delete(date);
      }
    });
  }
}