import { ConsumptionManagementClient } from '@azure/arm-consumption';
import { DefaultAzureCredential } from '@azure/identity';
import { MockDataService } from './mock-data-service.js';

export interface CostDataParams {
  startDate: string;
  endDate: string;
  subscriptionId?: string;
  department?: string;
  resourceType?: string;
}

export interface AnomalyParams {
  days: number;
  threshold: number;
}

export interface OptimizationParams {
  department?: string;
  minSavings: number;
}

export interface UsageTrendsParams {
  resourceType?: string;
  period: 'daily' | 'weekly' | 'monthly';
  days: number;
}

export interface DepartmentBreakdownParams {
  month?: string;
}

export interface RightsizingParams {
  utilizationThreshold: number;
}

export class AzureCostService {
  private consumptionClient: ConsumptionManagementClient | null = null;
  private mockDataService: MockDataService;
  private useRealData: boolean = false;

  constructor(mockDataService: MockDataService) {
    this.mockDataService = mockDataService;
    this.initializeAzureClient();
  }

  private async initializeAzureClient() {
    try {
      // Check if Azure credentials are available
      const credential = new DefaultAzureCredential();
      const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
      
      if (subscriptionId) {
        this.consumptionClient = new ConsumptionManagementClient(credential, subscriptionId);
        this.useRealData = true;
        console.log('Azure Cost Service initialized with real Azure credentials');
      } else {
        console.log('Azure Cost Service using mock data (no AZURE_SUBSCRIPTION_ID found)');
      }
    } catch (error) {
      console.log('Azure Cost Service falling back to mock data:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async getCostData(params: CostDataParams) {
    if (this.useRealData && this.consumptionClient) {
      return this.getRealCostData(params);
    }
    return this.getMockCostData(params);
  }

  private async getRealCostData(params: CostDataParams) {
    try {
      const { startDate, endDate, subscriptionId, department, resourceType } = params;
      
      // Build query parameters for Azure Cost Management API
      const queryOptions = {
        type: 'ActualCost' as const,
        timeframe: 'Custom' as const,
        timePeriod: {
          from: new Date(startDate),
          to: new Date(endDate)
        },
        dataset: {
          granularity: 'Daily' as const,
          aggregation: {
            totalCost: {
              name: 'PreTaxCost',
              function: 'Sum' as const
            }
          },
          grouping: [
            {
              type: 'Dimension' as const,
              name: 'ResourceGroup'
            },
            {
              type: 'Dimension' as const,
              name: 'ServiceName'
            }
          ],
          filter: this.buildCostFilter(department, resourceType)
        }
      };

      const scope = subscriptionId 
        ? `/subscriptions/${subscriptionId}`
        : `/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}`;

      const result = await this.consumptionClient.usageDetails.list(scope, queryOptions);
      
      return this.transformAzureCostData(result);
    } catch (error) {
      console.error('Error fetching real Azure cost data:', error);
      // Fallback to mock data on error
      return this.getMockCostData(params);
    }
  }

  private buildCostFilter(department?: string, resourceType?: string) {
    const filters = [];
    
    if (department) {
      filters.push({
        dimensions: {
          name: 'ResourceGroup',
          operator: 'In' as const,
          values: [`rg-${department.toLowerCase()}`]
        }
      });
    }
    
    if (resourceType) {
      filters.push({
        dimensions: {
          name: 'ServiceName',
          operator: 'In' as const,
          values: [resourceType]
        }
      });
    }
    
    if (filters.length === 0) return undefined;
    if (filters.length === 1) return filters[0];
    
    return {
      and: filters
    };
  }

  private transformAzureCostData(azureData: any) {
    // Transform Azure API response to our standard format
    const costData = [];
    
    for (const item of azureData) {
      costData.push({
        id: item.id || `cost-${Date.now()}-${Math.random()}`,
        date: item.date || new Date().toISOString().split('T')[0],
        cost: parseFloat(item.cost || item.pretaxCost || '0'),
        currency: item.currency || 'USD',
        resourceGroup: item.resourceGroup || 'Unknown',
        serviceName: item.serviceName || 'Unknown',
        resourceType: item.resourceType || 'Unknown',
        department: this.extractDepartmentFromResourceGroup(item.resourceGroup),
        subscriptionId: item.subscriptionId || process.env.AZURE_SUBSCRIPTION_ID,
        tags: item.tags || {},
        metadata: {
          billingPeriod: item.billingPeriod,
          meterCategory: item.meterCategory,
          meterSubCategory: item.meterSubCategory,
          meterName: item.meterName,
          unitOfMeasure: item.unitOfMeasure,
          quantity: item.quantity
        }
      });
    }
    
    return {
      data: costData,
      summary: {
        totalCost: costData.reduce((sum, item) => sum + item.cost, 0),
        recordCount: costData.length,
        dateRange: {
          start: costData[0]?.date,
          end: costData[costData.length - 1]?.date
        }
      },
      source: 'azure-api'
    };
  }

  private extractDepartmentFromResourceGroup(resourceGroup?: string): string {
    if (!resourceGroup) return 'Unknown';
    
    // Extract department from resource group naming convention
    // e.g., "rg-engineering-prod" -> "engineering"
    const match = resourceGroup.match(/rg-([^-]+)/);
    return match ? match[1] : 'Unknown';
  }

  private async getMockCostData(params: CostDataParams) {
    // Generate realistic mock data based on parameters
    const mockData = this.mockDataService.generateCostData({
      startDate: params.startDate,
      endDate: params.endDate,
      department: params.department,
      resourceType: params.resourceType
    });

    return {
      data: mockData,
      summary: {
        totalCost: mockData.reduce((sum: number, item: any) => sum + item.cost, 0),
        recordCount: mockData.length,
        dateRange: {
          start: params.startDate,
          end: params.endDate
        }
      },
      source: 'mock-data'
    };
  }

  async detectCostAnomalies(params: AnomalyParams) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - params.days);

    const costData = await this.getCostData({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });

    // Statistical anomaly detection
    const dailyCosts = this.aggregateDailyCosts(costData.data);
    const anomalies = this.detectStatisticalAnomalies(dailyCosts, params.threshold);

    return {
      anomalies,
      summary: {
        totalAnomalies: anomalies.length,
        analysisPeriod: params.days,
        threshold: params.threshold
      },
      recommendations: this.generateAnomalyRecommendations(anomalies)
    };
  }

  private aggregateDailyCosts(costData: any[]) {
    const dailyTotals = new Map();
    
    for (const item of costData) {
      const date = item.date;
      const current = dailyTotals.get(date) || 0;
      dailyTotals.set(date, current + item.cost);
    }
    
    return Array.from(dailyTotals.entries()).map(([date, cost]) => ({
      date,
      cost: cost as number
    }));
  }

  private detectStatisticalAnomalies(dailyCosts: any[], threshold: number) {
    const costs = dailyCosts.map(d => d.cost);
    const mean = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
    const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);

    const anomalies = [];
    
    for (const dayData of dailyCosts) {
      const zScore = Math.abs((dayData.cost - mean) / stdDev);
      
      if (zScore > threshold) {
        anomalies.push({
          date: dayData.date,
          cost: dayData.cost,
          expectedCost: mean,
          deviation: dayData.cost - mean,
          zScore,
          severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
          type: dayData.cost > mean ? 'spike' : 'drop'
        });
      }
    }
    
    return anomalies;
  }

  private generateAnomalyRecommendations(anomalies: any[]) {
    const recommendations = [];
    
    for (const anomaly of anomalies) {
      if (anomaly.type === 'spike' && anomaly.severity === 'high') {
        recommendations.push({
          type: 'immediate_action',
          title: `Investigate ${anomaly.date} cost spike`,
          description: `Cost increased by ${(anomaly.deviation).toFixed(2)} (${(anomaly.zScore * 100).toFixed(0)}% above normal)`,
          priority: 'high',
          actions: [
            'Review resource scaling events',
            'Check for new deployments',
            'Analyze resource utilization'
          ]
        });
      }
    }
    
    return recommendations;
  }

  async getOptimizationRecommendations(params: OptimizationParams) {
    // Get recent cost data for analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const costData = await this.getCostData({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      department: params.department
    });

    const recommendations = this.analyzeOptimizationOpportunities(costData.data, params.minSavings);

    return {
      recommendations,
      summary: {
        totalPotentialSavings: recommendations.reduce((sum: number, rec: any) => sum + rec.monthlySavings, 0),
        recommendationCount: recommendations.length,
        analysisDate: new Date().toISOString()
      }
    };
  }

  private analyzeOptimizationOpportunities(costData: any[], minSavings: number) {
    const recommendations = [];
    
    // Analyze by service type for rightsizing opportunities
    const serviceAnalysis = this.groupByService(costData);
    
    for (const [serviceName, serviceData] of serviceAnalysis) {
      const avgDailyCost = serviceData.reduce((sum: number, item: any) => sum + item.cost, 0) / serviceData.length;
      const monthlyCost = avgDailyCost * 30;
      
      // Rightsizing recommendation
      if (monthlyCost > minSavings * 2) {
        const potentialSavings = monthlyCost * 0.25; // Assume 25% savings from rightsizing
        
        if (potentialSavings >= minSavings) {
          recommendations.push({
            type: 'rightsizing',
            title: `Rightsize ${serviceName} resources`,
            description: `${serviceName} shows potential for 25% cost reduction through rightsizing`,
            monthlySavings: potentialSavings,
            currentMonthlyCost: monthlyCost,
            effort: 'medium',
            risk: 'low',
            actions: [
              'Analyze resource utilization metrics',
              'Identify over-provisioned instances',
              'Implement gradual downsizing'
            ]
          });
        }
      }
      
      // Reserved instance recommendation
      if (serviceName.includes('Virtual Machines') && monthlyCost > minSavings) {
        const riSavings = monthlyCost * 0.4; // 40% savings with reserved instances
        
        recommendations.push({
          type: 'reserved_instances',
          title: `Purchase Reserved Instances for ${serviceName}`,
          description: `Save up to 40% with 1-year reserved instances`,
          monthlySavings: riSavings,
          currentMonthlyCost: monthlyCost,
          effort: 'low',
          risk: 'low',
          actions: [
            'Analyze usage patterns',
            'Purchase 1-year reserved instances',
            'Monitor utilization'
          ]
        });
      }
    }
    
    return recommendations.filter(rec => rec.monthlySavings >= minSavings);
  }

  private groupByService(costData: any[]) {
    const serviceMap = new Map();
    
    for (const item of costData) {
      const serviceName = item.serviceName || 'Unknown';
      if (!serviceMap.has(serviceName)) {
        serviceMap.set(serviceName, []);
      }
      serviceMap.get(serviceName).push(item);
    }
    
    return serviceMap;
  }

  async getUsageTrends(params: UsageTrendsParams) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - params.days);

    const costData = await this.getCostData({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      resourceType: params.resourceType
    });

    const trends = this.calculateTrends(costData.data, params.period);

    return {
      trends,
      summary: {
        period: params.period,
        analysisWindow: params.days,
        totalDataPoints: trends.length,
        overallTrend: this.calculateOverallTrend(trends)
      }
    };
  }

  private calculateTrends(costData: any[], period: string) {
    // Group data by period
    const groupedData = this.groupDataByPeriod(costData, period);
    
    return Array.from(groupedData.entries()).map(([periodKey, data]) => ({
      period: periodKey,
      totalCost: data.reduce((sum: number, item: any) => sum + item.cost, 0),
      resourceCount: data.length,
      avgCostPerResource: data.reduce((sum: number, item: any) => sum + item.cost, 0) / data.length
    })).sort((a, b) => a.period.localeCompare(b.period));
  }

  private groupDataByPeriod(costData: any[], period: string) {
    const grouped = new Map();
    
    for (const item of costData) {
      let periodKey: string;
      const date = new Date(item.date);
      
      switch (period) {
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default: // daily
          periodKey = item.date;
      }
      
      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, []);
      }
      grouped.get(periodKey).push(item);
    }
    
    return grouped;
  }

  private calculateOverallTrend(trends: any[]) {
    if (trends.length < 2) return 'insufficient_data';
    
    const firstPeriod = trends[0].totalCost;
    const lastPeriod = trends[trends.length - 1].totalCost;
    const change = ((lastPeriod - firstPeriod) / firstPeriod) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  async getDepartmentBreakdown(params: DepartmentBreakdownParams) {
    const month = params.month || new Date().toISOString().slice(0, 7);
    const [year, monthNum] = month.split('-');
    
    const startDate = `${year}-${monthNum}-01`;
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];

    const costData = await this.getCostData({ startDate, endDate });
    
    const departmentBreakdown = this.groupByDepartment(costData.data);

    return {
      breakdown: departmentBreakdown,
      summary: {
        month,
        totalCost: Object.values(departmentBreakdown).reduce((sum: number, dept: any) => sum + dept.totalCost, 0),
        departmentCount: Object.keys(departmentBreakdown).length
      }
    };
  }

  private groupByDepartment(costData: any[]) {
    const departments: any = {};
    
    for (const item of costData) {
      const dept = item.department || 'Unknown';
      
      if (!departments[dept]) {
        departments[dept] = {
          totalCost: 0,
          resourceCount: 0,
          services: new Set(),
          topResources: []
        };
      }
      
      departments[dept].totalCost += item.cost;
      departments[dept].resourceCount += 1;
      departments[dept].services.add(item.serviceName);
    }
    
    // Convert sets to arrays and calculate percentages
    for (const dept of Object.keys(departments)) {
      departments[dept].services = Array.from(departments[dept].services);
    }
    
    return departments;
  }

  async getResourceRightsizing(params: RightsizingParams) {
    // This would typically integrate with Azure Monitor for utilization data
    // For now, we'll simulate rightsizing recommendations
    
    const costData = await this.getCostData({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });

    const rightsizingOpportunities = this.identifyRightsizingOpportunities(
      costData.data, 
      params.utilizationThreshold
    );

    return {
      opportunities: rightsizingOpportunities,
      summary: {
        totalOpportunities: rightsizingOpportunities.length,
        potentialMonthlySavings: rightsizingOpportunities.reduce((sum: number, opp: any) => sum + opp.monthlySavings, 0),
        utilizationThreshold: params.utilizationThreshold
      }
    };
  }

  private identifyRightsizingOpportunities(costData: any[], utilizationThreshold: number) {
    const opportunities = [];
    
    // Group by resource and simulate utilization data
    const resourceGroups = this.groupByResource(costData);
    
    for (const [resourceId, resourceData] of resourceGroups) {
      const monthlyCost = resourceData.reduce((sum: number, item: any) => sum + item.cost, 0);
      
      // Simulate low utilization (in real implementation, this would come from Azure Monitor)
      const simulatedUtilization = Math.random() * 100;
      
      if (simulatedUtilization < utilizationThreshold && monthlyCost > 50) {
        const recommendedSize = this.getRecommendedSize(resourceData[0].serviceName, simulatedUtilization);
        const potentialSavings = monthlyCost * 0.3; // Assume 30% savings
        
        opportunities.push({
          resourceId,
          resourceType: resourceData[0].serviceName,
          currentMonthlyCost: monthlyCost,
          currentUtilization: simulatedUtilization,
          recommendedAction: recommendedSize,
          monthlySavings: potentialSavings,
          confidence: simulatedUtilization < 10 ? 'high' : 'medium'
        });
      }
    }
    
    return opportunities.sort((a, b) => b.monthlySavings - a.monthlySavings);
  }

  private groupByResource(costData: any[]) {
    const resourceMap = new Map();
    
    for (const item of costData) {
      const resourceId = item.resourceGroup + '/' + item.serviceName;
      if (!resourceMap.has(resourceId)) {
        resourceMap.set(resourceId, []);
      }
      resourceMap.get(resourceId).push(item);
    }
    
    return resourceMap;
  }

  private getRecommendedSize(serviceName: string, utilization: number) {
    if (serviceName.includes('Virtual Machines')) {
      if (utilization < 10) return 'Downsize to smaller VM or consider shutdown schedule';
      if (utilization < 25) return 'Downsize to next smaller VM size';
      return 'Consider burstable VM types';
    }
    
    if (serviceName.includes('Storage')) {
      return 'Move to cooler storage tier or implement lifecycle policies';
    }
    
    return 'Review resource configuration and usage patterns';
  }
}