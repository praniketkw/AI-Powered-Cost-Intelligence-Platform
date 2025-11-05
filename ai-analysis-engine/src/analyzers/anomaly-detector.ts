import { AIAnalysisEngine } from '../core/analysis-engine.js';

export class AnomalyDetector {
  private analysisEngine: AIAnalysisEngine;

  constructor(analysisEngine: AIAnalysisEngine) {
    this.analysisEngine = analysisEngine;
  }

  async detect(costData: any[], options?: any): Promise<any> {
    return this.analysisEngine.analyze({
      type: 'anomaly_detection',
      data: { costData, threshold: options?.threshold || 2.0 },
      options
    });
  }
}