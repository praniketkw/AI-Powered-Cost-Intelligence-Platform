import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/**
 * Core AI Analysis Engine using Claude for intelligent cost insights
 * Provides structured analysis capabilities for enterprise cost data
 */

export interface AnalysisRequest {
  type: 'cost_analysis' | 'anomaly_detection' | 'optimization' | 'forecasting' | 'interactive_query';
  data: any;
  context?: any;
  options?: any;
}

export interface AnalysisResponse {
  success: boolean;
  data: any;
  insights: string[];
  confidence: number;
  metadata: {
    processingTime: number;
    tokensUsed?: number;
    analysisType: string;
  };
}

export class AIAnalysisEngine {
  private anthropic: Anthropic;
  private readonly maxRetries = 3;
  private readonly timeout = 30000; // 30 seconds

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  /**
   * Analyze cost data with structured prompts and responses
   */
  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = this.buildPrompt(request);
      const response = await this.callClaude(prompt, request.type);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: response.data,
        insights: response.insights,
        confidence: response.confidence,
        metadata: {
          processingTime,
          tokensUsed: response.tokensUsed,
          analysisType: request.type
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        insights: [`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        confidence: 0,
        metadata: {
          processingTime: Date.now() - startTime,
          analysisType: request.type
        }
      };
    }
  }

  /**
   * Interactive query processing for natural language cost questions
   */
  async processInteractiveQuery(query: string, costData: any[], context?: any): Promise<AnalysisResponse> {
    const request: AnalysisRequest = {
      type: 'interactive_query',
      data: { query, costData: this.sampleData(costData, 1000) }, // Limit data size
      context,
      options: { interactive: true }
    };

    return this.analyze(request);
  }

  /**
   * Generate real-time insights from streaming cost data
   */
  async generateRealtimeInsights(costData: any[], previousInsights?: string[]): Promise<AnalysisResponse> {
    const request: AnalysisRequest = {
      type: 'cost_analysis',
      data: { costData: this.sampleData(costData, 500), previousInsights },
      options: { realtime: true, focus: 'trends_and_alerts' }
    };

    return this.analyze(request);
  }

  private buildPrompt(request: AnalysisRequest): string {
    const baseContext = `You are an expert enterprise cloud cost analyst with deep knowledge of Azure services, cost optimization strategies, and financial analysis. You work with large-scale SaaS platforms processing millions in cloud spend annually.

IMPORTANT: Always respond with valid JSON in this exact format:
{
  "data": { /* your analysis results */ },
  "insights": ["insight 1", "insight 2", ...],
  "confidence": 0.85 /* confidence score 0-1 */
}`;

    switch (request.type) {
      case 'cost_analysis':
        return this.buildCostAnalysisPrompt(request, baseContext);
      case 'anomaly_detection':
        return this.buildAnomalyDetectionPrompt(request, baseContext);
      case 'optimization':
        return this.buildOptimizationPrompt(request, baseContext);
      case 'forecasting':
        return this.buildForecastingPrompt(request, baseContext);
      case 'interactive_query':
        return this.buildInteractiveQueryPrompt(request, baseContext);
      default:
        throw new Error(`Unknown analysis type: ${request.type}`);
    }
  }

  private buildCostAnalysisPrompt(request: AnalysisRequest, baseContext: string): string {
    const { costData, previousInsights } = request.data;
    const isRealtime = request.options?.realtime;

    return `${baseContext}

TASK: Analyze enterprise Azure cost data and provide actionable insights.

COST DATA SAMPLE:
${JSON.stringify(costData.slice(0, 10), null, 2)}

TOTAL RECORDS: ${costData.length}
${previousInsights ? `PREVIOUS INSIGHTS: ${previousInsights.join(', ')}` : ''}

${isRealtime ? 'FOCUS: Real-time trends, alerts, and immediate action items.' : 'FOCUS: Comprehensive cost analysis and patterns.'}

Analyze the data and provide:
1. Key cost trends and patterns
2. Department/team spending analysis
3. Resource utilization insights
4. Immediate cost concerns or opportunities
5. Actionable recommendations

Return your analysis in the required JSON format with:
- data: { totalSpend, topSpenders, trends, alerts, recommendations }
- insights: Array of 3-5 key insights in plain English
- confidence: Your confidence in the analysis (0-1)`;
  }

  private buildAnomalyDetectionPrompt(request: AnalysisRequest, baseContext: string): string {
    const { costData, threshold } = request.data;

    return `${baseContext}

TASK: Detect and explain cost anomalies in enterprise Azure spending.

COST DATA SAMPLE:
${JSON.stringify(costData.slice(0, 15), null, 2)}

TOTAL RECORDS: ${costData.length}
ANOMALY THRESHOLD: ${threshold || 'Standard (2 std dev)'}

Analyze for anomalies and provide:
1. Statistical anomaly detection results
2. Business context for each anomaly
3. Potential root causes
4. Risk assessment (financial impact)
5. Recommended actions

Return your analysis in the required JSON format with:
- data: { anomalies: [{ resource, deviation, cause, impact, action }], summary }
- insights: Array of key anomaly insights
- confidence: Your confidence in anomaly explanations (0-1)`;
  }

  private buildOptimizationPrompt(request: AnalysisRequest, baseContext: string): string {
    const { costData } = request.data;
    const { department, minSavings } = request.context || {};

    return `${baseContext}

TASK: Generate AI-powered cost optimization recommendations for enterprise infrastructure.

COST DATA SAMPLE:
${JSON.stringify(costData.slice(0, 10), null, 2)}

TOTAL RECORDS: ${costData.length}
${department ? `FOCUS DEPARTMENT: ${department}` : 'SCOPE: All departments'}
${minSavings ? `MINIMUM SAVINGS: $${minSavings}/month` : ''}

Analyze and recommend:
1. Rightsizing opportunities (over-provisioned resources)
2. Reserved instance/savings plan opportunities
3. Resource scheduling for non-prod environments
4. Storage tier optimization
5. Unused resource identification
6. Architecture optimization suggestions

Return your analysis in the required JSON format with:
- data: { recommendations: [{ type, title, savings, effort, risk, details }], totalSavings }
- insights: Array of optimization insights
- confidence: Your confidence in savings estimates (0-1)`;
  }

  private buildForecastingPrompt(request: AnalysisRequest, baseContext: string): string {
    const { historicalData, forecastPeriod } = request.data;

    return `${baseContext}

TASK: Forecast future Azure costs based on historical patterns and trends.

HISTORICAL DATA SAMPLE:
${JSON.stringify(historicalData.slice(0, 10), null, 2)}

TOTAL RECORDS: ${historicalData.length}
FORECAST PERIOD: ${forecastPeriod || '3 months'}

Analyze patterns and forecast:
1. Overall cost trajectory
2. Seasonal patterns and variations
3. Growth trends by department/service
4. Budget risk assessment
5. Scenario planning (best/worst/likely cases)

Return your analysis in the required JSON format with:
- data: { forecast: [{ period, predictedCost, confidence }], trends, scenarios }
- insights: Array of forecasting insights
- confidence: Your confidence in predictions (0-1)`;
  }

  private buildInteractiveQueryPrompt(request: AnalysisRequest, baseContext: string): string {
    const { query, costData } = request.data;

    return `${baseContext}

TASK: Answer the user's specific question about Azure cost data.

USER QUESTION: "${query}"

RELEVANT COST DATA:
${JSON.stringify(costData.slice(0, 20), null, 2)}

TOTAL RECORDS: ${costData.length}

Provide a comprehensive answer that:
1. Directly addresses the user's question
2. Uses specific data from the cost records
3. Provides context and explanations
4. Suggests follow-up actions if relevant
5. Includes relevant metrics and comparisons

Return your analysis in the required JSON format with:
- data: { answer, metrics, comparisons, recommendations }
- insights: Array of insights related to the question
- confidence: Your confidence in the answer (0-1)`;
  }

  private async callClaude(prompt: string, analysisType: string): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 2000, // Reduced for cost efficiency
          temperature: 0.1, // Low temperature for consistent analysis
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('Unexpected response type from Claude');
        }

        // Parse JSON response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in Claude response');
        }

        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        // Validate response structure
        if (!parsedResponse.data || !parsedResponse.insights || typeof parsedResponse.confidence !== 'number') {
          throw new Error('Invalid response structure from Claude');
        }

        return {
          ...parsedResponse,
          tokensUsed: response.usage.input_tokens + response.usage.output_tokens
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === this.maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError || new Error('Failed to get response from Claude');
  }

  private sampleData(data: any[], maxSize: number): any[] {
    if (data.length <= maxSize) {
      return data;
    }
    
    // Intelligent sampling: take recent data + random sample from older data
    const recentData = data.slice(-Math.floor(maxSize * 0.7));
    const olderData = data.slice(0, -Math.floor(maxSize * 0.7));
    const randomOlderSample = olderData
      .sort(() => Math.random() - 0.5)
      .slice(0, maxSize - recentData.length);
    
    return [...randomOlderSample, ...recentData];
  }
}