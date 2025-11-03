import { AIAnalysisEngine, AnalysisResponse } from '../core/analysis-engine.js';

/**
 * Real-time Insights Generator
 * Continuously analyzes streaming cost data to provide live insights and alerts
 */

export interface RealtimeInsight {
  id: string;
  type: 'alert' | 'trend' | 'opportunity' | 'anomaly' | 'forecast';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: {
    financial: number; // Dollar impact
    operational: 'low' | 'medium' | 'high';
  };
  actionRequired: boolean;
  suggestedActions: string[];
  timestamp: string;
  expiresAt?: string;
  metadata: {
    department?: string;
    resourceType?: string;
    confidence: number;
  };
}

export interface RealtimeInsightsResponse {
  insights: RealtimeInsight[];
  summary: {
    totalAlerts: number;
    criticalIssues: number;
    potentialSavings: number;
    trendsDetected: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export class RealtimeInsightsGenerator {
  private analysisEngine: AIAnalysisEngine;
  private insightHistory: Map<string, RealtimeInsight[]> = new Map();
  private lastAnalysisTime: Date = new Date();

  constructor(analysisEngine: AIAnalysisEngine) {
    this.analysisEngine = analysisEngine;
  }

  /**
   * Generate real-time insights from streaming cost data
   */
  async generateInsights(costData: any[], options?: {
    includeForecasting?: boolean;
    alertThreshold?: number;
    focusDepartment?: string;
  }): Promise<RealtimeInsightsResponse> {
    const currentTime = new Date();
    const timeSinceLastAnalysis = currentTime.getTime() - this.lastAnalysisTime.getTime();
    
    // Get recent data (last 24 hours)
    const recentData = this.getRecentData(costData, 24);
    
    // Get previous insights for context
    const previousInsights = this.getPreviousInsights();
    
    // Generate AI-powered insights
    const aiResponse = await this.analysisEngine.generateRealtimeInsights(
      recentData,
      previousInsights.map(insight => insight.description)
    );

    // Process and structure insights
    const insights = await this.processAIInsights(aiResponse, recentData, options);
    
    // Store insights in history
    this.storeInsights(insights);
    this.lastAnalysisTime = currentTime;

    // Generate summary and recommendations
    const summary = this.generateSummary(insights);
    const recommendations = this.generateRecommendations(insights, aiResponse);

    return {
      insights: insights.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity)),
      summary,
      recommendations
    };
  }

  /**
   * Generate insights for specific department or resource type
   */
  async generateFocusedInsights(costData: any[], focus: {
    department?: string;
    resourceType?: string;
    timeframe?: 'hour' | 'day' | 'week';
  }): Promise<RealtimeInsightsResponse> {
    const filteredData = costData.filter(record => {
      if (focus.department && record.department !== focus.department) return false;
      if (focus.resourceType && record.resourceType !== focus.resourceType) return false;
      return true;
    });

    const timeframeHours = focus.timeframe === 'hour' ? 1 : focus.timeframe === 'day' ? 24 : 168;
    const recentData = this.getRecentData(filteredData, timeframeHours);

    return this.generateInsights(recentData, { focusDepartment: focus.department });
  }

  /**
   * Get live cost alerts based on thresholds and patterns
   */
  async generateLiveAlerts(costData: any[], thresholds: {
    dailySpendLimit?: number;
    anomalyThreshold?: number;
    departmentBudgets?: Record<string, number>;
  }): Promise<RealtimeInsight[]> {
    const alerts: RealtimeInsight[] = [];
    const today = new Date().toISOString().split('T')[0];
    const todayData = costData.filter(record => record.date === today);

    // Daily spend limit alerts
    if (thresholds.dailySpendLimit) {
      const todaySpend = todayData.reduce((sum, record) => sum + record.cost, 0);
      if (todaySpend > thresholds.dailySpendLimit) {
        alerts.push({
          id: `daily-limit-${today}`,
          type: 'alert',
          severity: 'high',
          title: 'Daily Spend Limit Exceeded',
          description: `Today's spending ($${todaySpend.toFixed(2)}) has exceeded the daily limit of $${thresholds.dailySpendLimit}`,
          impact: {
            financial: todaySpend - thresholds.dailySpendLimit,
            operational: 'high'
          },
          actionRequired: true,
          suggestedActions: [
            'Review high-cost resources from today',
            'Check for any unusual resource scaling',
            'Consider implementing spending alerts'
          ],
          timestamp: new Date().toISOString(),
          metadata: {
            confidence: 1.0
          }
        });
      }
    }

    // Department budget alerts
    if (thresholds.departmentBudgets) {
      const departmentSpend = new Map<string, number>();
      todayData.forEach(record => {
        const current = departmentSpend.get(record.department) || 0;
        departmentSpend.set(record.department, current + record.cost);
      });

      departmentSpend.forEach((spend, department) => {
        const budget = thresholds.departmentBudgets![department];
        if (budget && spend > budget) {
          alerts.push({
            id: `dept-budget-${department}-${today}`,
            type: 'alert',
            severity: 'medium',
            title: `${department} Budget Alert`,
            description: `${department} has spent $${spend.toFixed(2)} today, exceeding their daily budget of $${budget}`,
            impact: {
              financial: spend - budget,
              operational: 'medium'
            },
            actionRequired: true,
            suggestedActions: [
              `Review ${department}'s resource usage`,
              'Check for any unplanned deployments',
              'Consider adjusting budget or resource allocation'
            ],
            timestamp: new Date().toISOString(),
            metadata: {
              department,
              confidence: 1.0
            }
          });
        }
      });
    }

    return alerts;
  }

  private async processAIInsights(aiResponse: AnalysisResponse, costData: any[], options?: any): Promise<RealtimeInsight[]> {
    const insights: RealtimeInsight[] = [];
    const currentTime = new Date().toISOString();

    // Process AI insights into structured format
    if (aiResponse.data?.alerts) {
      aiResponse.data.alerts.forEach((alert: any, index: number) => {
        insights.push({
          id: `ai-alert-${Date.now()}-${index}`,
          type: 'alert',
          severity: this.mapSeverity(alert.severity || 'medium'),
          title: alert.title || 'Cost Alert',
          description: alert.description || alert.message,
          impact: {
            financial: alert.impact || 0,
            operational: alert.operationalImpact || 'medium'
          },
          actionRequired: alert.actionRequired !== false,
          suggestedActions: alert.actions || [],
          timestamp: currentTime,
          metadata: {
            department: alert.department,
            resourceType: alert.resourceType,
            confidence: aiResponse.confidence
          }
        });
      });
    }

    // Process trends
    if (aiResponse.data?.trends) {
      aiResponse.data.trends.forEach((trend: any, index: number) => {
        insights.push({
          id: `trend-${Date.now()}-${index}`,
          type: 'trend',
          severity: trend.direction === 'increasing' ? 'medium' : 'low',
          title: `Cost Trend: ${trend.title}`,
          description: trend.description,
          impact: {
            financial: trend.projectedImpact || 0,
            operational: 'low'
          },
          actionRequired: trend.direction === 'increasing',
          suggestedActions: trend.recommendations || [],
          timestamp: currentTime,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          metadata: {
            confidence: aiResponse.confidence
          }
        });
      });
    }

    // Process opportunities
    if (aiResponse.data?.recommendations) {
      aiResponse.data.recommendations.forEach((rec: any, index: number) => {
        insights.push({
          id: `opportunity-${Date.now()}-${index}`,
          type: 'opportunity',
          severity: rec.savings > 1000 ? 'high' : 'medium',
          title: `Optimization Opportunity: ${rec.title}`,
          description: rec.description,
          impact: {
            financial: rec.savings || 0,
            operational: rec.effort || 'medium'
          },
          actionRequired: false,
          suggestedActions: rec.actions || [],
          timestamp: currentTime,
          metadata: {
            confidence: aiResponse.confidence
          }
        });
      });
    }

    return insights;
  }

  private getRecentData(costData: any[], hours: number): any[] {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    return costData.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= cutoffTime;
    });
  }

  private getPreviousInsights(): RealtimeInsight[] {
    const allInsights: RealtimeInsight[] = [];
    this.insightHistory.forEach(insights => {
      allInsights.push(...insights);
    });
    
    // Return recent insights (last 24 hours)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);
    
    return allInsights.filter(insight => {
      const insightTime = new Date(insight.timestamp);
      return insightTime >= cutoffTime;
    });
  }

  private storeInsights(insights: RealtimeInsight[]): void {
    const key = new Date().toISOString().split('T')[0]; // Store by date
    this.insightHistory.set(key, insights);
    
    // Clean up old insights (keep last 7 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    this.insightHistory.forEach((_, date) => {
      if (new Date(date) < cutoffDate) {
        this.insightHistory.delete(date);
      }
    });
  }

  private generateSummary(insights: RealtimeInsight[]): RealtimeInsightsResponse['summary'] {
    const alerts = insights.filter(i => i.type === 'alert');
    const criticalIssues = insights.filter(i => i.severity === 'critical');
    const opportunities = insights.filter(i => i.type === 'opportunity');
    const trends = insights.filter(i => i.type === 'trend');
    
    const potentialSavings = opportunities.reduce((sum, opp) => sum + opp.impact.financial, 0);

    return {
      totalAlerts: alerts.length,
      criticalIssues: criticalIssues.length,
      potentialSavings: Math.round(potentialSavings),
      trendsDetected: trends.length
    };
  }

  private generateRecommendations(insights: RealtimeInsight[], aiResponse: AnalysisResponse): RealtimeInsightsResponse['recommendations'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // Process critical and high severity insights for immediate actions
    insights
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .forEach(insight => {
        immediate.push(...insight.suggestedActions.slice(0, 2));
      });

    // Process medium severity for short-term actions
    insights
      .filter(i => i.severity === 'medium')
      .forEach(insight => {
        shortTerm.push(...insight.suggestedActions.slice(0, 1));
      });

    // Add AI-generated recommendations
    if (aiResponse.insights) {
      aiResponse.insights.forEach(insight => {
        if (insight.includes('immediate') || insight.includes('urgent')) {
          immediate.push(insight);
        } else if (insight.includes('consider') || insight.includes('plan')) {
          shortTerm.push(insight);
        } else {
          longTerm.push(insight);
        }
      });
    }

    return {
      immediate: [...new Set(immediate)].slice(0, 5),
      shortTerm: [...new Set(shortTerm)].slice(0, 5),
      longTerm: [...new Set(longTerm)].slice(0, 5)
    };
  }

  private mapSeverity(severity: string): RealtimeInsight['severity'] {
    switch (severity.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  }

  private getSeverityWeight(severity: RealtimeInsight['severity']): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }
}