import { AIAnalysisEngine, AnalysisResponse } from '../core/analysis-engine.js';

/**
 * Correlation Engine
 * Links cost changes to business events, deployments, and performance metrics
 * Solves the #1 enterprise problem: "Why did our costs spike?"
 */

export interface BusinessEvent {
  id: string;
  type: 'deployment' | 'incident' | 'feature_launch' | 'scaling_event' | 'configuration_change';
  timestamp: string;
  title: string;
  description: string;
  team: string;
  department: string;
  metadata: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    affectedServices?: string[];
    changeSize?: 'small' | 'medium' | 'large';
    rollbackAvailable?: boolean;
  };
}

export interface PerformanceMetric {
  timestamp: string;
  resourceName: string;
  metrics: {
    cpuUtilization: number;
    memoryUtilization: number;
    requestCount: number;
    responseTime: number;
    errorRate: number;
  };
}

export interface CostCorrelation {
  costChange: {
    amount: number;
    percentage: number;
    timeframe: string;
    affectedResources: string[];
  };
  correlatedEvents: Array<{
    event: BusinessEvent;
    correlationStrength: number; // 0-1
    timeOffset: number; // minutes from cost change
    likelyRootCause: boolean;
  }>;
  performanceCorrelation: {
    cpuCorrelation: number;
    memoryCorrelation: number;
    requestCorrelation: number;
    strongestCorrelation: 'cpu' | 'memory' | 'requests' | 'none';
  };
  rootCauseAnalysis: {
    primaryCause: string;
    contributingFactors: string[];
    confidence: number;
    suggestedActions: string[];
    preventionRecommendations: string[];
  };
}

export class CorrelationEngine {
  private analysisEngine: AIAnalysisEngine;
  private eventHistory: BusinessEvent[] = [];
  private performanceHistory: PerformanceMetric[] = [];

  constructor(analysisEngine: AIAnalysisEngine) {
    this.analysisEngine = analysisEngine;
  }

  /**
   * Correlate cost changes with business events and performance metrics
   */
  async correlateCostChange(
    costData: any[],
    costChangeTimestamp: string,
    businessEvents: BusinessEvent[],
    performanceMetrics: PerformanceMetric[]
  ): Promise<CostCorrelation> {
    // Store events and metrics for future analysis
    this.eventHistory.push(...businessEvents);
    this.performanceHistory.push(...performanceMetrics);

    // Identify the cost change
    const costChange = this.identifyCostChange(costData, costChangeTimestamp);
    
    // Find temporally correlated events
    const correlatedEvents = this.findCorrelatedEvents(costChangeTimestamp, businessEvents);
    
    // Analyze performance correlation
    const performanceCorrelation = this.analyzePerformanceCorrelation(
      costChangeTimestamp,
      performanceMetrics,
      costChange.affectedResources
    );

    // Use AI for root cause analysis
    const rootCauseAnalysis = await this.performRootCauseAnalysis(
      costChange,
      correlatedEvents,
      performanceCorrelation
    );

    return {
      costChange,
      correlatedEvents,
      performanceCorrelation,
      rootCauseAnalysis
    };
  }

  /**
   * Predict cost impact of planned events
   */
  async predictEventCostImpact(
    plannedEvent: BusinessEvent,
    historicalCostData: any[],
    similarEvents: BusinessEvent[]
  ): Promise<{
    predictedCostImpact: number;
    confidence: number;
    timeframe: string;
    riskFactors: string[];
    mitigationStrategies: string[];
  }> {
    // Analyze similar historical events
    const historicalImpacts = await this.analyzeSimilarEvents(similarEvents, historicalCostData);
    
    // Use AI to predict impact
    const aiResponse = await this.analysisEngine.analyze({
      type: 'forecasting',
      data: {
        plannedEvent,
        historicalImpacts,
        currentCostBaseline: this.calculateCurrentBaseline(historicalCostData)
      },
      options: { focus: 'event_impact_prediction' }
    });

    return {
      predictedCostImpact: aiResponse.data?.predictedImpact || 0,
      confidence: aiResponse.confidence,
      timeframe: aiResponse.data?.timeframe || '24 hours',
      riskFactors: aiResponse.data?.riskFactors || [],
      mitigationStrategies: aiResponse.insights
    };
  }

  /**
   * Generate proactive alerts for cost-risky events
   */
  async generateProactiveAlerts(
    upcomingEvents: BusinessEvent[],
    currentCostTrends: any[],
    budgetConstraints: { monthly: number; daily: number }
  ): Promise<Array<{
    event: BusinessEvent;
    alertLevel: 'info' | 'warning' | 'critical';
    predictedImpact: number;
    budgetRisk: number; // 0-1
    recommendedActions: string[];
  }>> {
    const alerts = [];

    for (const event of upcomingEvents) {
      const impact = await this.predictEventCostImpact(event, currentCostTrends, []);
      const budgetRisk = this.calculateBudgetRisk(impact.predictedCostImpact, budgetConstraints);
      
      if (budgetRisk > 0.3) { // Only alert if >30% budget risk
        alerts.push({
          event,
          alertLevel: budgetRisk > 0.8 ? 'critical' : budgetRisk > 0.5 ? 'warning' : 'info',
          predictedImpact: impact.predictedCostImpact,
          budgetRisk,
          recommendedActions: impact.mitigationStrategies
        });
      }
    }

    return alerts.sort((a, b) => b.budgetRisk - a.budgetRisk);
  }

  /**
   * Create event timeline for cost investigation
   */
  createEventTimeline(
    costChangeTimestamp: string,
    windowHours: number = 24
  ): Array<{
    timestamp: string;
    type: 'cost_change' | 'business_event' | 'performance_change';
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    metadata: any;
  }> {
    const timeline = [];
    const startTime = new Date(costChangeTimestamp);
    startTime.setHours(startTime.getHours() - windowHours);
    const endTime = new Date(costChangeTimestamp);
    endTime.setHours(endTime.getHours() + windowHours);

    // Add business events
    this.eventHistory
      .filter(event => {
        const eventTime = new Date(event.timestamp);
        return eventTime >= startTime && eventTime <= endTime;
      })
      .forEach(event => {
        timeline.push({
          timestamp: event.timestamp,
          type: 'business_event',
          title: event.title,
          description: event.description,
          impact: this.determineEventImpact(event),
          metadata: { event, team: event.team, department: event.department }
        });
      });

    // Add performance changes
    const performanceChanges = this.detectPerformanceChanges(startTime, endTime);
    performanceChanges.forEach(change => {
      timeline.push({
        timestamp: change.timestamp,
        type: 'performance_change',
        title: `Performance Change: ${change.metric}`,
        description: `${change.metric} changed by ${change.changePercentage}%`,
        impact: change.changePercentage > 0 ? 'negative' : 'positive',
        metadata: change
      });
    });

    return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private identifyCostChange(costData: any[], timestamp: string): CostCorrelation['costChange'] {
    const changeTime = new Date(timestamp);
    const beforeWindow = new Date(changeTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours before
    const afterWindow = new Date(changeTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours after

    const beforeCosts = costData.filter(record => {
      const recordTime = new Date(record.date);
      return recordTime >= beforeWindow && recordTime < changeTime;
    });

    const afterCosts = costData.filter(record => {
      const recordTime = new Date(record.date);
      return recordTime >= changeTime && recordTime <= afterWindow;
    });

    const beforeTotal = beforeCosts.reduce((sum, record) => sum + record.cost, 0);
    const afterTotal = afterCosts.reduce((sum, record) => sum + record.cost, 0);
    const change = afterTotal - beforeTotal;
    const percentage = beforeTotal > 0 ? (change / beforeTotal) * 100 : 0;

    // Identify affected resources
    const affectedResources = [...new Set([
      ...beforeCosts.map(r => r.resourceName),
      ...afterCosts.map(r => r.resourceName)
    ])];

    return {
      amount: Math.round(change * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      timeframe: '4 hours',
      affectedResources
    };
  }

  private findCorrelatedEvents(
    costChangeTimestamp: string,
    businessEvents: BusinessEvent[]
  ): CostCorrelation['correlatedEvents'] {
    const changeTime = new Date(costChangeTimestamp);
    const correlationWindow = 4 * 60 * 60 * 1000; // 4 hours

    return businessEvents
      .map(event => {
        const eventTime = new Date(event.timestamp);
        const timeOffset = (eventTime.getTime() - changeTime.getTime()) / (1000 * 60); // minutes
        const timeDiff = Math.abs(timeOffset);
        
        // Calculate correlation strength based on time proximity and event type
        let correlationStrength = Math.max(0, 1 - (timeDiff / (4 * 60))); // Decay over 4 hours
        
        // Boost correlation for high-impact event types
        if (event.type === 'deployment' || event.type === 'scaling_event') {
          correlationStrength *= 1.5;
        }
        if (event.metadata.severity === 'high' || event.metadata.severity === 'critical') {
          correlationStrength *= 1.3;
        }

        correlationStrength = Math.min(1, correlationStrength);

        return {
          event,
          correlationStrength,
          timeOffset,
          likelyRootCause: correlationStrength > 0.7 && timeDiff < 60 // Within 1 hour, high correlation
        };
      })
      .filter(correlation => correlation.correlationStrength > 0.2) // Only include meaningful correlations
      .sort((a, b) => b.correlationStrength - a.correlationStrength);
  }

  private analyzePerformanceCorrelation(
    costChangeTimestamp: string,
    performanceMetrics: PerformanceMetric[],
    affectedResources: string[]
  ): CostCorrelation['performanceCorrelation'] {
    const changeTime = new Date(costChangeTimestamp);
    const windowStart = new Date(changeTime.getTime() - 2 * 60 * 60 * 1000);
    const windowEnd = new Date(changeTime.getTime() + 2 * 60 * 60 * 1000);

    const relevantMetrics = performanceMetrics.filter(metric => {
      const metricTime = new Date(metric.timestamp);
      return metricTime >= windowStart && 
             metricTime <= windowEnd && 
             affectedResources.includes(metric.resourceName);
    });

    if (relevantMetrics.length === 0) {
      return {
        cpuCorrelation: 0,
        memoryCorrelation: 0,
        requestCorrelation: 0,
        strongestCorrelation: 'none'
      };
    }

    // Calculate correlations (simplified - in real implementation would use proper correlation algorithms)
    const avgCpu = relevantMetrics.reduce((sum, m) => sum + m.metrics.cpuUtilization, 0) / relevantMetrics.length;
    const avgMemory = relevantMetrics.reduce((sum, m) => sum + m.metrics.memoryUtilization, 0) / relevantMetrics.length;
    const avgRequests = relevantMetrics.reduce((sum, m) => sum + m.metrics.requestCount, 0) / relevantMetrics.length;

    // Simulate correlation strength based on utilization levels
    const cpuCorrelation = Math.min(1, avgCpu / 100);
    const memoryCorrelation = Math.min(1, avgMemory / 100);
    const requestCorrelation = Math.min(1, avgRequests / 10000); // Normalize request count

    let strongestCorrelation: 'cpu' | 'memory' | 'requests' | 'none' = 'none';
    const maxCorrelation = Math.max(cpuCorrelation, memoryCorrelation, requestCorrelation);
    
    if (maxCorrelation > 0.3) {
      if (cpuCorrelation === maxCorrelation) strongestCorrelation = 'cpu';
      else if (memoryCorrelation === maxCorrelation) strongestCorrelation = 'memory';
      else strongestCorrelation = 'requests';
    }

    return {
      cpuCorrelation: Math.round(cpuCorrelation * 100) / 100,
      memoryCorrelation: Math.round(memoryCorrelation * 100) / 100,
      requestCorrelation: Math.round(requestCorrelation * 100) / 100,
      strongestCorrelation
    };
  }

  private async performRootCauseAnalysis(
    costChange: CostCorrelation['costChange'],
    correlatedEvents: CostCorrelation['correlatedEvents'],
    performanceCorrelation: CostCorrelation['performanceCorrelation']
  ): Promise<CostCorrelation['rootCauseAnalysis']> {
    const aiResponse = await this.analysisEngine.analyze({
      type: 'anomaly_detection',
      data: {
        costChange,
        correlatedEvents: correlatedEvents.slice(0, 5), // Top 5 correlations
        performanceCorrelation
      },
      options: { focus: 'root_cause_analysis' }
    });

    // Determine primary cause based on correlations
    let primaryCause = 'Unknown cause';
    if (correlatedEvents.length > 0 && correlatedEvents[0].likelyRootCause) {
      primaryCause = correlatedEvents[0].event.title;
    } else if (performanceCorrelation.strongestCorrelation !== 'none') {
      primaryCause = `High ${performanceCorrelation.strongestCorrelation} utilization`;
    }

    const contributingFactors = correlatedEvents
      .filter(c => !c.likelyRootCause && c.correlationStrength > 0.4)
      .map(c => c.event.title);

    return {
      primaryCause,
      contributingFactors,
      confidence: aiResponse.confidence,
      suggestedActions: aiResponse.insights.slice(0, 3),
      preventionRecommendations: aiResponse.data?.preventionRecommendations || []
    };
  }

  private async analyzeSimilarEvents(events: BusinessEvent[], costData: any[]): Promise<any[]> {
    // Analyze historical cost impact of similar events
    return events.map(event => {
      const eventTime = new Date(event.timestamp);
      const beforeCosts = costData.filter(record => {
        const recordTime = new Date(record.date);
        return recordTime >= new Date(eventTime.getTime() - 2 * 60 * 60 * 1000) &&
               recordTime < eventTime;
      });
      
      const afterCosts = costData.filter(record => {
        const recordTime = new Date(record.date);
        return recordTime >= eventTime &&
               recordTime <= new Date(eventTime.getTime() + 2 * 60 * 60 * 1000);
      });

      const beforeTotal = beforeCosts.reduce((sum, r) => sum + r.cost, 0);
      const afterTotal = afterCosts.reduce((sum, r) => sum + r.cost, 0);
      const impact = afterTotal - beforeTotal;

      return {
        event,
        costImpact: impact,
        impactPercentage: beforeTotal > 0 ? (impact / beforeTotal) * 100 : 0
      };
    });
  }

  private calculateCurrentBaseline(costData: any[]): number {
    const recentData = costData.slice(-24); // Last 24 records
    return recentData.reduce((sum, record) => sum + record.cost, 0) / recentData.length;
  }

  private calculateBudgetRisk(predictedImpact: number, budgetConstraints: { monthly: number; daily: number }): number {
    const dailyRisk = Math.abs(predictedImpact) / budgetConstraints.daily;
    const monthlyRisk = Math.abs(predictedImpact * 30) / budgetConstraints.monthly;
    return Math.min(1, Math.max(dailyRisk, monthlyRisk));
  }

  private determineEventImpact(event: BusinessEvent): 'positive' | 'negative' | 'neutral' {
    if (event.type === 'incident' || event.metadata.severity === 'critical') return 'negative';
    if (event.type === 'feature_launch') return 'positive';
    if (event.type === 'scaling_event') return 'negative'; // Usually increases costs
    return 'neutral';
  }

  private detectPerformanceChanges(startTime: Date, endTime: Date): Array<{
    timestamp: string;
    metric: string;
    changePercentage: number;
    resourceName: string;
  }> {
    // Simulate performance change detection
    const changes = [];
    const metrics = this.performanceHistory.filter(m => {
      const metricTime = new Date(m.timestamp);
      return metricTime >= startTime && metricTime <= endTime;
    });

    // Group by resource and detect significant changes
    const resourceMetrics = new Map<string, PerformanceMetric[]>();
    metrics.forEach(metric => {
      if (!resourceMetrics.has(metric.resourceName)) {
        resourceMetrics.set(metric.resourceName, []);
      }
      resourceMetrics.get(metric.resourceName)!.push(metric);
    });

    resourceMetrics.forEach((resourceData, resourceName) => {
      if (resourceData.length < 2) return;

      const first = resourceData[0];
      const last = resourceData[resourceData.length - 1];

      // Check for significant CPU changes
      const cpuChange = ((last.metrics.cpuUtilization - first.metrics.cpuUtilization) / first.metrics.cpuUtilization) * 100;
      if (Math.abs(cpuChange) > 20) {
        changes.push({
          timestamp: last.timestamp,
          metric: 'CPU Utilization',
          changePercentage: Math.round(cpuChange),
          resourceName
        });
      }

      // Check for significant memory changes
      const memoryChange = ((last.metrics.memoryUtilization - first.metrics.memoryUtilization) / first.metrics.memoryUtilization) * 100;
      if (Math.abs(memoryChange) > 20) {
        changes.push({
          timestamp: last.timestamp,
          metric: 'Memory Utilization',
          changePercentage: Math.round(memoryChange),
          resourceName
        });
      }
    });

    return changes;
  }
}