import { AIAnalysisEngine } from './core/analysis-engine.js';
import { CostAnalyzer } from './analyzers/cost-analyzer.js';
import { AnomalyDetector } from './analyzers/anomaly-detector.js';
import { OptimizationRecommender } from './analyzers/optimization-recommender.js';
import { ForecastingEngine } from './analyzers/forecasting-engine.js';
import { InteractiveQueryProcessor } from './processors/interactive-query-processor.js';
import { RealtimeInsightsGenerator } from './processors/realtime-insights-generator.js';

/**
 * AI Analysis Engine Entry Point
 * Provides interactive, real-time cost analysis and optimization insights
 */

export class AIAnalysisPlatform {
  private analysisEngine: AIAnalysisEngine;
  private costAnalyzer: CostAnalyzer;
  private anomalyDetector: AnomalyDetector;
  private optimizationRecommender: OptimizationRecommender;
  private forecastingEngine: ForecastingEngine;
  private queryProcessor: InteractiveQueryProcessor;
  private insightsGenerator: RealtimeInsightsGenerator;

  constructor(anthropicApiKey: string) {
    this.analysisEngine = new AIAnalysisEngine(anthropicApiKey);
    this.costAnalyzer = new CostAnalyzer(this.analysisEngine);
    this.anomalyDetector = new AnomalyDetector(this.analysisEngine);
    this.optimizationRecommender = new OptimizationRecommender(this.analysisEngine);
    this.forecastingEngine = new ForecastingEngine(this.analysisEngine);
    this.queryProcessor = new InteractiveQueryProcessor(this.analysisEngine);
    this.insightsGenerator = new RealtimeInsightsGenerator(this.analysisEngine);
  }

  /**
   * Process interactive user queries about cost data
   */
  async processQuery(query: string, context?: any): Promise<any> {
    return this.queryProcessor.processQuery(query, context);
  }

  /**
   * Generate real-time insights from cost data
   */
  async generateRealtimeInsights(costData: any[]): Promise<any> {
    return this.insightsGenerator.generateInsights(costData);
  }

  /**
   * Analyze cost patterns and trends
   */
  async analyzeCosts(costData: any[], options?: any): Promise<any> {
    return this.costAnalyzer.analyze(costData, options);
  }

  /**
   * Detect cost anomalies with AI explanations
   */
  async detectAnomalies(costData: any[], options?: any): Promise<any> {
    return this.anomalyDetector.detect(costData, options);
  }

  /**
   * Generate optimization recommendations
   */
  async generateRecommendations(costData: any[], context?: any): Promise<any> {
    return this.optimizationRecommender.generateRecommendations(costData, context);
  }

  /**
   * Forecast future costs
   */
  async forecastCosts(historicalData: any[], options?: any): Promise<any> {
    return this.forecastingEngine.forecast(historicalData, options);
  }
}

export * from './core/analysis-engine.js';
export * from './analyzers/cost-analyzer.js';
export * from './analyzers/anomaly-detector.js';
export * from './analyzers/optimization-recommender.js';
export * from './analyzers/forecasting-engine.js';
export * from './processors/interactive-query-processor.js';
export * from './processors/realtime-insights-generator.js';