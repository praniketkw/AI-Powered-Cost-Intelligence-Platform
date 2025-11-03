import { AIAnalysisEngine, AnalysisResponse } from '../core/analysis-engine.js';

/**
 * Interactive Query Processor
 * Handles natural language queries about cost data with contextual understanding
 */

export interface QueryContext {
  userId?: string;
  department?: string;
  timeframe?: string;
  previousQueries?: string[];
  currentView?: 'dashboard' | 'department' | 'resource' | 'trends';
}

export interface QueryResponse extends AnalysisResponse {
  queryType: 'cost_inquiry' | 'comparison' | 'trend_analysis' | 'optimization_request' | 'anomaly_investigation';
  suggestedFollowUps: string[];
  visualizationHints: {
    chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
  };
}

export class InteractiveQueryProcessor {
  private analysisEngine: AIAnalysisEngine;
  private queryHistory: Map<string, string[]> = new Map();

  constructor(analysisEngine: AIAnalysisEngine) {
    this.analysisEngine = analysisEngine;
  }

  /**
   * Process natural language queries about cost data
   */
  async processQuery(query: string, costData: any[], context?: QueryContext): Promise<QueryResponse> {
    // Classify query type
    const queryType = this.classifyQuery(query);
    
    // Add query to history
    if (context?.userId) {
      const userHistory = this.queryHistory.get(context.userId) || [];
      userHistory.push(query);
      this.queryHistory.set(context.userId, userHistory.slice(-10)); // Keep last 10 queries
    }

    // Enhance query with context
    const enhancedQuery = this.enhanceQueryWithContext(query, context);
    
    // Process with AI engine
    const response = await this.analysisEngine.processInteractiveQuery(
      enhancedQuery,
      costData,
      context
    );

    // Generate follow-up suggestions
    const suggestedFollowUps = this.generateFollowUpSuggestions(query, queryType, response);
    
    // Generate visualization hints
    const visualizationHints = this.generateVisualizationHints(query, queryType, response);

    return {
      ...response,
      queryType,
      suggestedFollowUps,
      visualizationHints
    };
  }

  /**
   * Process conversational follow-up queries
   */
  async processFollowUp(query: string, costData: any[], previousResponse: QueryResponse, context?: QueryContext): Promise<QueryResponse> {
    const contextualQuery = `Previous question context: "${previousResponse.insights.join('. ')}"
    
Follow-up question: "${query}"

Please provide a response that builds on the previous analysis.`;

    return this.processQuery(contextualQuery, costData, context);
  }

  /**
   * Generate smart suggestions based on current data
   */
  async generateSmartSuggestions(costData: any[], context?: QueryContext): Promise<string[]> {
    const suggestions: string[] = [];

    // Analyze data patterns to suggest relevant queries
    const departments = [...new Set(costData.map(record => record.department))];
    const resourceTypes = [...new Set(costData.map(record => record.resourceType))];
    const recentData = costData.filter(record => {
      const recordDate = new Date(record.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return recordDate >= weekAgo;
    });

    // Department-based suggestions
    if (departments.length > 1) {
      suggestions.push(`Which department is spending the most this month?`);
      suggestions.push(`Compare costs between ${departments[0]} and ${departments[1]} departments`);
    }

    // Resource-based suggestions
    if (resourceTypes.length > 0) {
      const topResourceType = resourceTypes[0];
      suggestions.push(`What's driving the cost of ${topResourceType} resources?`);
      suggestions.push(`Show me optimization opportunities for compute resources`);
    }

    // Time-based suggestions
    suggestions.push(`How do this week's costs compare to last week?`);
    suggestions.push(`What are the cost trends for the past 30 days?`);
    
    // Anomaly-based suggestions
    if (recentData.length > 0) {
      suggestions.push(`Are there any unusual cost spikes in the recent data?`);
      suggestions.push(`What resources had the biggest cost changes recently?`);
    }

    // Context-specific suggestions
    if (context?.department) {
      suggestions.push(`What are the top cost drivers for ${context.department}?`);
      suggestions.push(`How can ${context.department} reduce their cloud costs?`);
    }

    return suggestions.slice(0, 6); // Return top 6 suggestions
  }

  private classifyQuery(query: string): QueryResponse['queryType'] {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('versus')) {
      return 'comparison';
    }
    
    if (lowerQuery.includes('trend') || lowerQuery.includes('over time') || lowerQuery.includes('pattern')) {
      return 'trend_analysis';
    }
    
    if (lowerQuery.includes('optimize') || lowerQuery.includes('reduce') || lowerQuery.includes('save')) {
      return 'optimization_request';
    }
    
    if (lowerQuery.includes('anomaly') || lowerQuery.includes('spike') || lowerQuery.includes('unusual')) {
      return 'anomaly_investigation';
    }
    
    return 'cost_inquiry';
  }

  private enhanceQueryWithContext(query: string, context?: QueryContext): string {
    let enhancedQuery = query;

    if (context?.department) {
      enhancedQuery += ` (Focus on ${context.department} department)`;
    }

    if (context?.timeframe) {
      enhancedQuery += ` (Time period: ${context.timeframe})`;
    }

    if (context?.previousQueries && context.previousQueries.length > 0) {
      enhancedQuery += ` (Previous context: User has asked about ${context.previousQueries.slice(-2).join(', ')})`;
    }

    if (context?.currentView) {
      enhancedQuery += ` (Current view: ${context.currentView})`;
    }

    return enhancedQuery;
  }

  private generateFollowUpSuggestions(query: string, queryType: QueryResponse['queryType'], response: AnalysisResponse): string[] {
    const suggestions: string[] = [];

    switch (queryType) {
      case 'cost_inquiry':
        suggestions.push('What are the optimization opportunities for these costs?');
        suggestions.push('How do these costs compare to last month?');
        suggestions.push('Which resources are driving these costs?');
        break;

      case 'comparison':
        suggestions.push('What factors explain the differences?');
        suggestions.push('How can we optimize the higher-cost option?');
        suggestions.push('What are the trends for each option over time?');
        break;

      case 'trend_analysis':
        suggestions.push('What will the costs look like next month?');
        suggestions.push('What caused the biggest changes in the trend?');
        suggestions.push('How can we influence this trend positively?');
        break;

      case 'optimization_request':
        suggestions.push('What would be the impact of implementing these recommendations?');
        suggestions.push('Which optimization has the lowest risk?');
        suggestions.push('How long would it take to implement these changes?');
        break;

      case 'anomaly_investigation':
        suggestions.push('What actions should we take for these anomalies?');
        suggestions.push('Are there similar patterns in other resources?');
        suggestions.push('How can we prevent these anomalies in the future?');
        break;
    }

    // Add data-specific suggestions based on response insights
    if (response.insights.some(insight => insight.includes('department'))) {
      suggestions.push('Show me a breakdown by department');
    }

    if (response.insights.some(insight => insight.includes('resource'))) {
      suggestions.push('Which specific resources need attention?');
    }

    return suggestions.slice(0, 4);
  }

  private generateVisualizationHints(query: string, queryType: QueryResponse['queryType'], response: AnalysisResponse): QueryResponse['visualizationHints'] {
    const lowerQuery = query.toLowerCase();

    // Default visualization based on query type
    switch (queryType) {
      case 'comparison':
        return {
          chartType: 'bar',
          xAxis: 'category',
          yAxis: 'cost',
          groupBy: 'department'
        };

      case 'trend_analysis':
        return {
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'cost',
          groupBy: 'department'
        };

      case 'cost_inquiry':
        if (lowerQuery.includes('breakdown') || lowerQuery.includes('distribution')) {
          return {
            chartType: 'pie',
            groupBy: 'department'
          };
        }
        return {
          chartType: 'bar',
          xAxis: 'resource',
          yAxis: 'cost'
        };

      case 'anomaly_investigation':
        return {
          chartType: 'scatter',
          xAxis: 'date',
          yAxis: 'cost',
          groupBy: 'resource'
        };

      case 'optimization_request':
        return {
          chartType: 'bar',
          xAxis: 'recommendation',
          yAxis: 'savings'
        };

      default:
        return {
          chartType: 'bar',
          xAxis: 'category',
          yAxis: 'cost'
        };
    }
  }
}