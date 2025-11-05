import { AIAnalysisEngine } from '../core/analysis-engine.js';

export class OptimizationRecommender {
  private analysisEngine: AIAnalysisEngine;

  constructor(analysisEngine: AIAnalysisEngine) {
    this.analysisEngine = analysisEngine;
  }

  async generateRecommendations(costData: any[], context?: any): Promise<any> {
    return this.analysisEngine.analyze({
      type: 'optimization',
      data: { costData },
      context,
      options: { focus: 'cost_reduction' }
    });
  }
}