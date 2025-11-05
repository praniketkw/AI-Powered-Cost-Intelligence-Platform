/**
 * API Client for Cost Optimization Platform
 * Connects frontend to the real backend API with Azure data
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface CostRecord {
  date: string;
  cost: number;
  service: string;
  resourceGroup: string;
  department?: string;
}

export interface CostSummary {
  totalCost: number;
  totalRecords: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface AIAnalysis {
  summary: string;
  insights: string[];
  recommendations: string[];
  riskFactors: string[];
  confidence: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health check
  async getHealth() {
    return this.request<{
      status: string;
      timestamp: string;
      services: Record<string, boolean>;
    }>('/health');
  }

  // Get Azure cost data
  async getAzureCosts() {
    return this.request<{
      records: CostRecord[];
      summary: CostSummary;
    }>('/api/azure/costs');
  }

  // Get AI analysis of cost data
  async getAIAnalysis(query?: string, costData?: CostRecord[]) {
    return this.request<{
      analysis: AIAnalysis;
      query: string;
      dataAnalyzed: number;
      tokensUsed: number;
    }>('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ query, costData }),
    });
  }

  // Get full analysis (Azure data + AI insights)
  async getFullAnalysis() {
    return this.request<{
      azureData: {
        records: number;
        totalCost: number;
        sampleRecords: CostRecord[];
      };
      aiAnalysis: AIAnalysis;
      metadata: {
        subscriptionId: string;
        dateRange: { start: string; end: string };
        tokensUsed: number;
      };
    }>('/api/full-analysis');
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Helper functions for transforming API data to dashboard format
export function transformCostDataForDashboard(apiData: any) {
  const { azureData, aiAnalysis } = apiData;
  
  // Ensure we have valid data structures
  const sampleRecords = azureData?.sampleRecords || [];
  const totalCost = azureData?.totalCost || 0;
  
  return {
    overview: {
      totalCost: totalCost,
      monthlyChange: 0, // Calculate from historical data
      budgetUtilization: 0, // Would need budget info
      activeAlerts: 0, // Would come from alerts API
      costPerUser: totalCost / 100, // Assuming 100 users
      efficiency: 85, // Would be calculated
    },
    costTrends: sampleRecords.length > 0 
      ? sampleRecords.map((record: CostRecord) => ({
          date: record.date,
          cost: record.cost || 0,
          budget: (record.cost || 0) * 1.2, // Mock budget line
          forecast: (record.cost || 0) * 1.1, // Mock forecast
        }))
      : generateMockTrendData(), // Generate some mock trend data when no real data
    departmentBreakdown: groupCostsByDepartment(sampleRecords),
    alerts: generateAlertsFromAnalysis(aiAnalysis),
    predictions: generatePredictionsFromAnalysis(aiAnalysis, totalCost),
  };
}

function generateMockTrendData() {
  // Generate 7 days of mock trend data when no real data is available
  const trends = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trends.push({
      date: date.toISOString().split('T')[0],
      cost: 0,
      budget: 100, // Mock budget line
      forecast: 0, // Mock forecast
    });
  }
  return trends;
}

function groupCostsByDepartment(records: CostRecord[]) {
  if (!records || records.length === 0) {
    // Return mock departments when no real data
    return [
      { name: 'Engineering', cost: 0, change: 0, resources: 0 },
      { name: 'Marketing', cost: 0, change: 0, resources: 0 },
      { name: 'Sales', cost: 0, change: 0, resources: 0 },
    ];
  }

  const departments = records.reduce((acc, record) => {
    const dept = record.department || extractDepartmentFromResourceGroup(record.resourceGroup);
    if (!acc[dept]) {
      acc[dept] = { name: dept, cost: 0, change: 0, resources: 0 };
    }
    acc[dept].cost += record.cost || 0;
    acc[dept].resources += 1;
    return acc;
  }, {} as Record<string, any>);

  return Object.values(departments);
}

function extractDepartmentFromResourceGroup(resourceGroup: string): string {
  // Extract department from resource group naming convention
  // e.g., "rg-engineering-prod" -> "engineering"
  const match = resourceGroup.match(/rg-([^-]+)/);
  return match ? match[1] : 'unknown';
}

function generateAlertsFromAnalysis(analysis: AIAnalysis) {
  const alerts = [];
  
  if (!analysis) {
    // Return a default alert when no analysis is available
    return [{
      id: 'no-data',
      type: 'info',
      title: 'No Cost Data Available',
      message: 'Your Azure subscription currently has no billable resources. Deploy some resources to see cost analysis.',
      timestamp: new Date().toISOString(),
      severity: 'low',
    }];
  }
  
  // Generate alerts from risk factors
  analysis.riskFactors?.forEach((risk, index) => {
    alerts.push({
      id: `risk-${index}`,
      type: 'warning',
      title: 'Risk Factor Identified',
      message: risk,
      timestamp: new Date().toISOString(),
      severity: 'medium',
    });
  });

  // Generate alerts from insights if they indicate issues
  analysis.insights?.forEach((insight, index) => {
    if (insight.toLowerCase().includes('increase') || insight.toLowerCase().includes('spike')) {
      alerts.push({
        id: `insight-${index}`,
        type: 'cost_increase',
        title: 'Cost Trend Alert',
        message: insight,
        timestamp: new Date().toISOString(),
        severity: 'low',
      });
    }
  });

  // If no alerts generated, add a default one
  if (alerts.length === 0) {
    alerts.push({
      id: 'all-good',
      type: 'success',
      title: 'All Systems Normal',
      message: 'No cost anomalies or issues detected in your Azure subscription.',
      timestamp: new Date().toISOString(),
      severity: 'low',
    });
  }

  return alerts;
}

function generatePredictionsFromAnalysis(analysis: AIAnalysis, totalCost: number) {
  const predictions = [];
  
  if (!analysis) {
    // Return default predictions when no analysis is available
    return [
      {
        type: 'optimization_opportunity' as const,
        title: 'Ready for Cost Optimization',
        description: 'Your Azure subscription is ready for resource deployment. Consider setting up cost monitoring and budgets.',
        confidence: 0.8,
        timeframe: 'Next 30 days',
        impact: 0
      }
    ];
  }

  // Generate predictions from AI insights
  if (analysis.insights && analysis.insights.length > 0) {
    analysis.insights.forEach((insight, index) => {
      if (insight.toLowerCase().includes('increase') || insight.toLowerCase().includes('growth')) {
        predictions.push({
          type: 'cost_spike' as const,
          title: 'Potential Cost Increase',
          description: insight,
          confidence: analysis.confidence || 0.7,
          timeframe: 'Next 7-14 days',
          impact: totalCost * 0.1 // Estimate 10% impact
        });
      } else if (insight.toLowerCase().includes('optimization') || insight.toLowerCase().includes('save')) {
        predictions.push({
          type: 'optimization_opportunity' as const,
          title: 'Cost Optimization Opportunity',
          description: insight,
          confidence: analysis.confidence || 0.8,
          timeframe: 'Next 30 days',
          impact: totalCost * 0.15 // Estimate 15% savings
        });
      }
    });
  }

  // Generate predictions from recommendations
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    analysis.recommendations.forEach((recommendation, index) => {
      predictions.push({
        type: 'optimization_opportunity' as const,
        title: 'AI Recommendation',
        description: recommendation,
        confidence: analysis.confidence || 0.75,
        timeframe: 'Next 30 days',
        impact: totalCost * 0.2 // Estimate 20% potential impact
      });
    });
  }

  // If no predictions generated, add a default one
  if (predictions.length === 0) {
    predictions.push({
      type: 'optimization_opportunity' as const,
      title: 'Stable Cost Environment',
      description: 'Your Azure costs are currently stable with no immediate concerns detected.',
      confidence: analysis.confidence || 0.9,
      timeframe: 'Next 30 days',
      impact: 0
    });
  }

  // Limit to 3 predictions to avoid overwhelming the UI
  return predictions.slice(0, 3);
}

// Hook for React components
export function useApi() {
  return {
    getHealth: () => apiClient.getHealth(),
    getAzureCosts: () => apiClient.getAzureCosts(),
    getAIAnalysis: (query?: string, costData?: CostRecord[]) => 
      apiClient.getAIAnalysis(query, costData),
    getFullAnalysis: () => apiClient.getFullAnalysis(),
  };
}