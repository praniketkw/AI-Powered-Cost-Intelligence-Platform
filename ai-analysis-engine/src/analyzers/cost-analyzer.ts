import { AIAnalysisEngine, AnalysisResponse } from '../core/analysis-engine.js';

/**
 * Cost Analyzer
 * Specialized analyzer for comprehensive cost pattern analysis
 */

export interface CostAnalysisOptions {
  groupBy?: 'department' | 'resourceType' | 'environment' | 'region';
  timeframe?: 'daily' | 'weekly' | 'monthly';
  includeForecasting?: boolean;
  compareWithPrevious?: boolean;
}

export interface CostAnalysisResult {
  summary: {
    totalCost: number;
    averageDailyCost: number;
    costTrend: 'increasing' | 'decreasing' | 'stable';
    trendPercentage: number;
  };
  breakdown: {
    byDepartment: Array<{ name: string; cost: number; percentage: number }>;
    byResourceType: Array<{ name: string; cost: number; count: number }>;
    byEnvironment: Array<{ name: string; cost: number; percentage: number }>;
    byRegion: Array<{ name: string; cost: number; percentage: number }>;
  };
  trends: {
    dailyTrends: Array<{ date: string; cost: number }>;
    weeklyTrends: Array<{ week: string; cost: number }>;
    monthlyTrends: Array<{ month: string; cost: number }>;
  };
  insights: string[];
  recommendations: string[];
}

export class CostAnalyzer {
  private analysisEngine: AIAnalysisEngine;

  constructor(analysisEngine: AIAnalysisEngine) {
    this.analysisEngine = analysisEngine;
  }

  /**
   * Perform comprehensive cost analysis
   */
  async analyze(costData: any[], options: CostAnalysisOptions = {}): Promise<CostAnalysisResult> {
    // Prepare data for analysis
    const processedData = this.preprocessData(costData, options);
    
    // Get AI insights
    const aiResponse = await this.analysisEngine.analyze({
      type: 'cost_analysis',
      data: { costData: processedData },
      options
    });

    // Generate statistical analysis
    const statisticalAnalysis = this.performStatisticalAnalysis(costData, options);
    
    // Combine AI insights with statistical analysis
    return this.combineAnalysis(statisticalAnalysis, aiResponse, options);
  }

  /**
   * Analyze cost trends over time
   */
  async analyzeTrends(costData: any[], timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<{
    trends: Array<{ period: string; cost: number; change: number }>;
    patterns: string[];
    forecast: Array<{ period: string; predictedCost: number; confidence: number }>;
  }> {
    const trends = this.calculateTrends(costData, timeframe);
    
    const aiResponse = await this.analysisEngine.analyze({
      type: 'cost_analysis',
      data: { costData, trends },
      options: { focus: 'trends', timeframe }
    });

    return {
      trends,
      patterns: aiResponse.insights,
      forecast: aiResponse.data?.forecast || []
    };
  }

  /**
   * Compare costs between different periods or segments
   */
  async compareCosts(
    currentData: any[],
    comparisonData: any[],
    comparisonType: 'period' | 'department' | 'environment'
  ): Promise<{
    comparison: {
      current: number;
      previous: number;
      change: number;
      changePercentage: number;
    };
    breakdown: Array<{
      category: string;
      current: number;
      previous: number;
      change: number;
    }>;
    insights: string[];
  }> {
    const currentTotal = currentData.reduce((sum, record) => sum + record.cost, 0);
    const previousTotal = comparisonData.reduce((sum, record) => sum + record.cost, 0);
    const change = currentTotal - previousTotal;
    const changePercentage = previousTotal > 0 ? (change / previousTotal) * 100 : 0;

    // Generate breakdown by category
    const breakdown = this.generateComparisonBreakdown(currentData, comparisonData, comparisonType);

    // Get AI insights on the comparison
    const aiResponse = await this.analysisEngine.analyze({
      type: 'cost_analysis',
      data: { currentData, comparisonData, comparisonType },
      options: { focus: 'comparison' }
    });

    return {
      comparison: {
        current: Math.round(currentTotal * 100) / 100,
        previous: Math.round(previousTotal * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercentage: Math.round(changePercentage * 100) / 100
      },
      breakdown,
      insights: aiResponse.insights
    };
  }

  /**
   * Analyze cost efficiency metrics
   */
  async analyzeEfficiency(costData: any[]): Promise<{
    efficiency: {
      costPerResource: number;
      utilizationScore: number;
      wastePercentage: number;
    };
    inefficiencies: Array<{
      type: string;
      description: string;
      impact: number;
      recommendation: string;
    }>;
    benchmarks: {
      industryAverage: number;
      bestPractice: number;
      currentPosition: 'above' | 'at' | 'below';
    };
  }> {
    const efficiency = this.calculateEfficiencyMetrics(costData);
    
    const aiResponse = await this.analysisEngine.analyze({
      type: 'cost_analysis',
      data: { costData, efficiency },
      options: { focus: 'efficiency' }
    });

    return {
      efficiency,
      inefficiencies: aiResponse.data?.inefficiencies || [],
      benchmarks: this.generateBenchmarks(efficiency, costData)
    };
  }

  private preprocessData(costData: any[], options: CostAnalysisOptions): any[] {
    let processedData = [...costData];

    // Sort by date
    processedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter by timeframe if specified
    if (options.timeframe) {
      const cutoffDate = this.getCutoffDate(options.timeframe);
      processedData = processedData.filter(record => new Date(record.date) >= cutoffDate);
    }

    return processedData;
  }

  private performStatisticalAnalysis(costData: any[], options: CostAnalysisOptions): any {
    const totalCost = costData.reduce((sum, record) => sum + record.cost, 0);
    const averageDailyCost = this.calculateAverageDailyCost(costData);
    const costTrend = this.calculateCostTrend(costData);
    
    return {
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        averageDailyCost: Math.round(averageDailyCost * 100) / 100,
        costTrend: costTrend.direction,
        trendPercentage: Math.round(costTrend.percentage * 100) / 100
      },
      breakdown: {
        byDepartment: this.groupAndSum(costData, 'department'),
        byResourceType: this.groupAndCount(costData, 'resourceType'),
        byEnvironment: this.groupAndSum(costData, 'environment'),
        byRegion: this.groupAndSum(costData, 'location')
      },
      trends: {
        dailyTrends: this.calculateDailyTrends(costData),
        weeklyTrends: this.calculateWeeklyTrends(costData),
        monthlyTrends: this.calculateMonthlyTrends(costData)
      }
    };
  }

  private combineAnalysis(statistical: any, aiResponse: AnalysisResponse, options: CostAnalysisOptions): CostAnalysisResult {
    return {
      summary: statistical.summary,
      breakdown: statistical.breakdown,
      trends: statistical.trends,
      insights: aiResponse.insights,
      recommendations: aiResponse.data?.recommendations || []
    };
  }

  private calculateAverageDailyCost(costData: any[]): number {
    const dailyCosts = new Map<string, number>();
    
    costData.forEach(record => {
      const date = record.date;
      const current = dailyCosts.get(date) || 0;
      dailyCosts.set(date, current + record.cost);
    });

    const totalDays = dailyCosts.size;
    const totalCost = Array.from(dailyCosts.values()).reduce((sum, cost) => sum + cost, 0);
    
    return totalDays > 0 ? totalCost / totalDays : 0;
  }

  private calculateCostTrend(costData: any[]): { direction: 'increasing' | 'decreasing' | 'stable'; percentage: number } {
    const dailyCosts = this.calculateDailyTrends(costData);
    
    if (dailyCosts.length < 2) {
      return { direction: 'stable', percentage: 0 };
    }

    const firstHalf = dailyCosts.slice(0, Math.floor(dailyCosts.length / 2));
    const secondHalf = dailyCosts.slice(Math.floor(dailyCosts.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.cost, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.cost, 0) / secondHalf.length;
    
    const change = secondHalfAvg - firstHalfAvg;
    const changePercentage = firstHalfAvg > 0 ? (change / firstHalfAvg) * 100 : 0;
    
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(changePercentage) < 5) {
      direction = 'stable';
    } else if (changePercentage > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    return { direction, percentage: Math.abs(changePercentage) };
  }

  private groupAndSum(costData: any[], field: string): Array<{ name: string; cost: number; percentage: number }> {
    const groups = new Map<string, number>();
    let totalCost = 0;

    costData.forEach(record => {
      const key = record[field] || 'Unknown';
      const current = groups.get(key) || 0;
      groups.set(key, current + record.cost);
      totalCost += record.cost;
    });

    return Array.from(groups.entries())
      .map(([name, cost]) => ({
        name,
        cost: Math.round(cost * 100) / 100,
        percentage: Math.round((cost / totalCost) * 10000) / 100
      }))
      .sort((a, b) => b.cost - a.cost);
  }

  private groupAndCount(costData: any[], field: string): Array<{ name: string; cost: number; count: number }> {
    const groups = new Map<string, { cost: number; count: number }>();

    costData.forEach(record => {
      const key = record[field] || 'Unknown';
      const current = groups.get(key) || { cost: 0, count: 0 };
      groups.set(key, {
        cost: current.cost + record.cost,
        count: current.count + 1
      });
    });

    return Array.from(groups.entries())
      .map(([name, data]) => ({
        name,
        cost: Math.round(data.cost * 100) / 100,
        count: data.count
      }))
      .sort((a, b) => b.cost - a.cost);
  }

  private calculateDailyTrends(costData: any[]): Array<{ date: string; cost: number }> {
    const dailyCosts = new Map<string, number>();
    
    costData.forEach(record => {
      const date = record.date;
      const current = dailyCosts.get(date) || 0;
      dailyCosts.set(date, current + record.cost);
    });

    return Array.from(dailyCosts.entries())
      .map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateWeeklyTrends(costData: any[]): Array<{ week: string; cost: number }> {
    const weeklyCosts = new Map<string, number>();
    
    costData.forEach(record => {
      const date = new Date(record.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const current = weeklyCosts.get(weekKey) || 0;
      weeklyCosts.set(weekKey, current + record.cost);
    });

    return Array.from(weeklyCosts.entries())
      .map(([week, cost]) => ({ week, cost: Math.round(cost * 100) / 100 }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private calculateMonthlyTrends(costData: any[]): Array<{ month: string; cost: number }> {
    const monthlyCosts = new Map<string, number>();
    
    costData.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const current = monthlyCosts.get(monthKey) || 0;
      monthlyCosts.set(monthKey, current + record.cost);
    });

    return Array.from(monthlyCosts.entries())
      .map(([month, cost]) => ({ month, cost: Math.round(cost * 100) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateTrends(costData: any[], timeframe: 'daily' | 'weekly' | 'monthly'): Array<{ period: string; cost: number; change: number }> {
    let trends: Array<{ period: string; cost: number }>;
    
    switch (timeframe) {
      case 'daily':
        trends = this.calculateDailyTrends(costData).map(t => ({ period: t.date, cost: t.cost }));
        break;
      case 'weekly':
        trends = this.calculateWeeklyTrends(costData).map(t => ({ period: t.week, cost: t.cost }));
        break;
      case 'monthly':
        trends = this.calculateMonthlyTrends(costData).map(t => ({ period: t.month, cost: t.cost }));
        break;
    }

    return trends.map((trend, index) => ({
      ...trend,
      change: index > 0 ? trend.cost - trends[index - 1].cost : 0
    }));
  }

  private generateComparisonBreakdown(currentData: any[], comparisonData: any[], comparisonType: string): Array<{
    category: string;
    current: number;
    previous: number;
    change: number;
  }> {
    const field = comparisonType === 'department' ? 'department' : 
                  comparisonType === 'environment' ? 'environment' : 'resourceType';

    const currentGroups = this.groupAndSum(currentData, field);
    const previousGroups = this.groupAndSum(comparisonData, field);
    
    const categories = new Set([
      ...currentGroups.map(g => g.name),
      ...previousGroups.map(g => g.name)
    ]);

    return Array.from(categories).map(category => {
      const current = currentGroups.find(g => g.name === category)?.cost || 0;
      const previous = previousGroups.find(g => g.name === category)?.cost || 0;
      
      return {
        category,
        current: Math.round(current * 100) / 100,
        previous: Math.round(previous * 100) / 100,
        change: Math.round((current - previous) * 100) / 100
      };
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }

  private calculateEfficiencyMetrics(costData: any[]): {
    costPerResource: number;
    utilizationScore: number;
    wastePercentage: number;
  } {
    const uniqueResources = new Set(costData.map(record => record.resourceName)).size;
    const totalCost = costData.reduce((sum, record) => sum + record.cost, 0);
    const costPerResource = uniqueResources > 0 ? totalCost / uniqueResources : 0;

    // Simulate utilization score based on environment distribution
    const prodCost = costData.filter(r => r.environment === 'prod').reduce((sum, r) => sum + r.cost, 0);
    const utilizationScore = totalCost > 0 ? (prodCost / totalCost) * 100 : 0;

    // Estimate waste based on low-cost resources and non-prod usage
    const lowCostResources = costData.filter(r => r.cost < 1).reduce((sum, r) => sum + r.cost, 0);
    const wastePercentage = totalCost > 0 ? (lowCostResources / totalCost) * 100 : 0;

    return {
      costPerResource: Math.round(costPerResource * 100) / 100,
      utilizationScore: Math.round(utilizationScore * 100) / 100,
      wastePercentage: Math.round(wastePercentage * 100) / 100
    };
  }

  private generateBenchmarks(efficiency: any, costData: any[]): {
    industryAverage: number;
    bestPractice: number;
    currentPosition: 'above' | 'at' | 'below';
  } {
    // Simulated industry benchmarks for SaaS companies
    const industryAverage = 75; // 75% utilization
    const bestPractice = 90; // 90% utilization
    
    let currentPosition: 'above' | 'at' | 'below';
    if (efficiency.utilizationScore >= bestPractice) {
      currentPosition = 'above';
    } else if (efficiency.utilizationScore >= industryAverage) {
      currentPosition = 'at';
    } else {
      currentPosition = 'below';
    }

    return {
      industryAverage,
      bestPractice,
      currentPosition
    };
  }

  private getCutoffDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case 'daily':
        now.setDate(now.getDate() - 30); // Last 30 days
        break;
      case 'weekly':
        now.setDate(now.getDate() - 90); // Last 90 days
        break;
      case 'monthly':
        now.setFullYear(now.getFullYear() - 1); // Last year
        break;
    }
    return now;
  }
}