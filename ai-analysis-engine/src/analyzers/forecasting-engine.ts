import { AIAnalysisEngine } from '../core/analysis-engine.js';

export class ForecastingEngine {
  private analysisEngine: AIAnalysisEngine;

  constructor(analysisEngine: AIAnalysisEngine) {
    this.analysisEngine = analysisEngine;
  }

  async forecast(historicalData: any[], options?: any): Promise<any> {
    return this.analysisEngine.analyze({
      type: 'forecasting',
      data: { historicalData, forecastPeriod: options?.forecastPeriod || '3 months' },
      options
    });
  }
}