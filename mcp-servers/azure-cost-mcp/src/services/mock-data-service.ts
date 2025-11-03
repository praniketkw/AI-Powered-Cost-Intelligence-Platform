import { costGenerator, CostRecord } from '../../../../mock-data/cost-data-generator.js';
import { ENTERPRISE_PROFILE } from '../../../../mock-data/enterprise-profile.js';

/**
 * Mock Data Service for generating realistic enterprise Azure cost data
 * Simulates a large-scale SaaS platform with complex infrastructure
 */

export interface CostSummary {
  totalCost: number;
  recordCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  topDepartments: Array<{
    department: string;
    cost: number;
    percentage: number;
  }>;
  topResourceTypes: Array<{
    resourceType: string;
    cost: number;
    count: number;
  }>;
}

export interface CostAnomaly {
  date: string;
  resourceName: string;
  resourceType: string;
  department: string;
  expectedCost: number;
  actualCost: number;
  deviationPercentage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'rightsizing' | 'scheduling' | 'reserved_instances' | 'storage_optimization' | 'unused_resources';
  title: string;
  description: string;
  department: string;
  resourcesAffected: number;
  monthlySavings: number;
  annualSavings: number;
  implementationEffort: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  priority: number;
  details: {
    currentCost: number;
    optimizedCost: number;
    resources: string[];
    actionRequired: string;
  };
}

export class MockDataService {
  private costDataCache: Map<string, CostRecord[]> = new Map();

  /**
   * Generate cost data for a specific date range
   */
  async generateCostData(startDate: string, endDate: string): Promise<CostRecord[]> {
    const cacheKey = `${startDate}-${endDate}`;
    
    if (this.costDataCache.has(cacheKey)) {
      return this.costDataCache.get(cacheKey)!;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const costData = costGenerator.generateCostData(start, end);
    this.costDataCache.set(cacheKey, costData);
    
    return costData;
  }

  /**
   * Generate realistic cost anomalies based on historical patterns
   */
  async generateCostAnomalies(days: number, threshold: number): Promise<CostAnomaly[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const costData = await this.generateCostData(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const anomalies: CostAnomaly[] = [];

    // Group by resource and calculate baseline costs
    const resourceBaselines = new Map<string, number[]>();
    
    costData.forEach(record => {
      const key = `${record.resourceName}-${record.resourceType}`;
      if (!resourceBaselines.has(key)) {
        resourceBaselines.set(key, []);
      }
      resourceBaselines.get(key)!.push(record.cost);
    });

    // Detect anomalies
    costData.forEach(record => {
      const key = `${record.resourceName}-${record.resourceType}`;
      const costs = resourceBaselines.get(key)!;
      const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
      const variance = costs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / costs.length;
      const stdDev = Math.sqrt(variance);
      
      const deviation = Math.abs(record.cost - mean) / stdDev;
      
      if (deviation > threshold) {
        const deviationPercentage = ((record.cost - mean) / mean) * 100;
        
        anomalies.push({
          date: record.date,
          resourceName: record.resourceName,
          resourceType: record.resourceType,
          department: record.department,
          expectedCost: Math.round(mean * 100) / 100,
          actualCost: record.cost,
          deviationPercentage: Math.round(deviationPercentage * 100) / 100,
          severity: this.calculateSeverity(deviation, Math.abs(deviationPercentage)),
          description: this.generateAnomalyDescription(record, deviationPercentage)
        });
      }
    });

    return anomalies.sort((a, b) => Math.abs(b.deviationPercentage) - Math.abs(a.deviationPercentage));
  }

  /**
   * Generate realistic optimization recommendations
   */
  async generateOptimizationRecommendations(department?: string, minSavings: number = 100): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Get recent cost data for analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const costData = await this.generateCostData(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const filteredData = department 
      ? costData.filter(record => record.department === department)
      : costData;

    // Generate different types of recommendations
    recommendations.push(...this.generateRightsizingRecommendations(filteredData, minSavings));
    recommendations.push(...this.generateSchedulingRecommendations(filteredData, minSavings));
    recommendations.push(...this.generateReservedInstanceRecommendations(filteredData, minSavings));
    recommendations.push(...this.generateStorageOptimizationRecommendations(filteredData, minSavings));
    recommendations.push(...this.generateUnusedResourceRecommendations(filteredData, minSavings));

    return recommendations
      .filter(rec => rec.monthlySavings >= minSavings)
      .sort((a, b) => b.monthlySavings - a.monthlySavings);
  }

  private generateRightsizingRecommendations(costData: CostRecord[], minSavings: number): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Find high-cost compute resources that could be rightsized
    const computeResources = costData.filter(record => 
      record.resourceType.includes('Compute') || record.resourceType.includes('ContainerService')
    );

    const resourceGroups = new Map<string, CostRecord[]>();
    computeResources.forEach(record => {
      const key = record.resourceName;
      if (!resourceGroups.has(key)) {
        resourceGroups.set(key, []);
      }
      resourceGroups.get(key)!.push(record);
    });

    resourceGroups.forEach((records, resourceName) => {
      const totalMonthlyCost = records.reduce((sum, record) => sum + record.cost, 0);
      const avgDailyCost = totalMonthlyCost / records.length;
      
      // Simulate 30% savings potential for rightsizing
      if (avgDailyCost > 50) { // Only recommend for resources > $50/day
        const monthlySavings = totalMonthlyCost * 0.3;
        
        if (monthlySavings >= minSavings) {
          recommendations.push({
            id: `rightsize-${resourceName.replace(/[^a-zA-Z0-9]/g, '-')}`,
            type: 'rightsizing',
            title: `Rightsize ${resourceName}`,
            description: `This resource shows low utilization patterns and can be downsized to reduce costs by 30%`,
            department: records[0].department,
            resourcesAffected: 1,
            monthlySavings: Math.round(monthlySavings),
            annualSavings: Math.round(monthlySavings * 12),
            implementationEffort: 'medium',
            riskLevel: 'low',
            priority: Math.round(monthlySavings / 100),
            details: {
              currentCost: Math.round(totalMonthlyCost),
              optimizedCost: Math.round(totalMonthlyCost * 0.7),
              resources: [resourceName],
              actionRequired: 'Resize VM to smaller SKU or reduce AKS node count'
            }
          });
        }
      }
    });

    return recommendations;
  }

  private generateSchedulingRecommendations(costData: CostRecord[], minSavings: number): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Find dev/staging resources that could be scheduled
    const nonProdResources = costData.filter(record => 
      record.environment === 'dev' || record.environment === 'staging'
    );

    const deptGroups = new Map<string, CostRecord[]>();
    nonProdResources.forEach(record => {
      if (!deptGroups.has(record.department)) {
        deptGroups.set(record.department, []);
      }
      deptGroups.get(record.department)!.push(record);
    });

    deptGroups.forEach((records, department) => {
      const totalMonthlyCost = records.reduce((sum, record) => sum + record.cost, 0);
      const monthlySavings = totalMonthlyCost * 0.6; // 60% savings from scheduling
      
      if (monthlySavings >= minSavings) {
        recommendations.push({
          id: `schedule-${department.replace(/[^a-zA-Z0-9]/g, '-')}`,
          type: 'scheduling',
          title: `Implement Auto-Scheduling for ${department} Non-Prod Resources`,
          description: `Schedule dev/staging resources to run only during business hours (9 AM - 6 PM, weekdays)`,
          department: department,
          resourcesAffected: new Set(records.map(r => r.resourceName)).size,
          monthlySavings: Math.round(monthlySavings),
          annualSavings: Math.round(monthlySavings * 12),
          implementationEffort: 'low',
          riskLevel: 'low',
          priority: Math.round(monthlySavings / 100),
          details: {
            currentCost: Math.round(totalMonthlyCost),
            optimizedCost: Math.round(totalMonthlyCost * 0.4),
            resources: Array.from(new Set(records.map(r => r.resourceName))),
            actionRequired: 'Configure Azure Automation or Logic Apps for resource scheduling'
          }
        });
      }
    });

    return recommendations;
  }

  private generateReservedInstanceRecommendations(costData: CostRecord[], minSavings: number): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Find stable production compute resources
    const prodCompute = costData.filter(record => 
      record.environment === 'prod' && 
      (record.resourceType.includes('Compute') || record.resourceType.includes('ContainerService'))
    );

    const resourceGroups = new Map<string, CostRecord[]>();
    prodCompute.forEach(record => {
      const key = `${record.department}-${record.resourceType}`;
      if (!resourceGroups.has(key)) {
        resourceGroups.set(key, []);
      }
      resourceGroups.get(key)!.push(record);
    });

    resourceGroups.forEach((records, key) => {
      const totalMonthlyCost = records.reduce((sum, record) => sum + record.cost, 0);
      const monthlySavings = totalMonthlyCost * 0.4; // 40% savings with reserved instances
      
      if (monthlySavings >= minSavings && totalMonthlyCost > 1000) { // Only for significant spend
        recommendations.push({
          id: `reserved-${key.replace(/[^a-zA-Z0-9]/g, '-')}`,
          type: 'reserved_instances',
          title: `Purchase Reserved Instances for ${records[0].department}`,
          description: `Stable production workloads can benefit from 1-year or 3-year reserved instance commitments`,
          department: records[0].department,
          resourcesAffected: new Set(records.map(r => r.resourceName)).size,
          monthlySavings: Math.round(monthlySavings),
          annualSavings: Math.round(monthlySavings * 12),
          implementationEffort: 'low',
          riskLevel: 'medium',
          priority: Math.round(monthlySavings / 100),
          details: {
            currentCost: Math.round(totalMonthlyCost),
            optimizedCost: Math.round(totalMonthlyCost * 0.6),
            resources: Array.from(new Set(records.map(r => r.resourceName))),
            actionRequired: 'Purchase reserved instances through Azure portal or EA agreement'
          }
        });
      }
    });

    return recommendations;
  }

  private generateStorageOptimizationRecommendations(costData: CostRecord[], minSavings: number): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    const storageResources = costData.filter(record => 
      record.resourceType.includes('Storage') || record.resourceType.includes('DocumentDB')
    );

    const deptGroups = new Map<string, CostRecord[]>();
    storageResources.forEach(record => {
      if (!deptGroups.has(record.department)) {
        deptGroups.set(record.department, []);
      }
      deptGroups.get(record.department)!.push(record);
    });

    deptGroups.forEach((records, department) => {
      const totalMonthlyCost = records.reduce((sum, record) => sum + record.cost, 0);
      const monthlySavings = totalMonthlyCost * 0.25; // 25% savings from storage optimization
      
      if (monthlySavings >= minSavings) {
        recommendations.push({
          id: `storage-${department.replace(/[^a-zA-Z0-9]/g, '-')}`,
          type: 'storage_optimization',
          title: `Optimize Storage Tiers for ${department}`,
          description: `Move infrequently accessed data to cooler storage tiers and implement lifecycle policies`,
          department: department,
          resourcesAffected: records.length,
          monthlySavings: Math.round(monthlySavings),
          annualSavings: Math.round(monthlySavings * 12),
          implementationEffort: 'medium',
          riskLevel: 'low',
          priority: Math.round(monthlySavings / 100),
          details: {
            currentCost: Math.round(totalMonthlyCost),
            optimizedCost: Math.round(totalMonthlyCost * 0.75),
            resources: records.map(r => r.resourceName),
            actionRequired: 'Configure storage lifecycle policies and move to appropriate tiers'
          }
        });
      }
    });

    return recommendations;
  }

  private generateUnusedResourceRecommendations(costData: CostRecord[], minSavings: number): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Simulate finding unused resources (resources with very low usage)
    const lowUsageResources = costData.filter(record => 
      record.cost < 5 && record.environment !== 'prod' // Small cost, non-prod
    );

    if (lowUsageResources.length > 0) {
      const totalMonthlyCost = lowUsageResources.reduce((sum, record) => sum + record.cost, 0);
      const monthlySavings = totalMonthlyCost * 0.9; // 90% savings by removing unused resources
      
      if (monthlySavings >= minSavings) {
        const deptGroups = new Map<string, CostRecord[]>();
        lowUsageResources.forEach(record => {
          if (!deptGroups.has(record.department)) {
            deptGroups.set(record.department, []);
          }
          deptGroups.get(record.department)!.push(record);
        });

        deptGroups.forEach((records, department) => {
          const deptCost = records.reduce((sum, record) => sum + record.cost, 0);
          const deptSavings = deptCost * 0.9;
          
          recommendations.push({
            id: `unused-${department.replace(/[^a-zA-Z0-9]/g, '-')}`,
            type: 'unused_resources',
            title: `Remove Unused Resources in ${department}`,
            description: `Identified resources with minimal usage that can be safely decommissioned`,
            department: department,
            resourcesAffected: records.length,
            monthlySavings: Math.round(deptSavings),
            annualSavings: Math.round(deptSavings * 12),
            implementationEffort: 'low',
            riskLevel: 'low',
            priority: Math.round(deptSavings / 50),
            details: {
              currentCost: Math.round(deptCost),
              optimizedCost: Math.round(deptCost * 0.1),
              resources: records.map(r => r.resourceName),
              actionRequired: 'Verify resources are unused and safely delete them'
            }
          });
        });
      }
    }

    return recommendations;
  }

  private calculateSeverity(deviation: number, percentageDeviation: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviation > 4 || percentageDeviation > 200) return 'critical';
    if (deviation > 3 || percentageDeviation > 100) return 'high';
    if (deviation > 2 || percentageDeviation > 50) return 'medium';
    return 'low';
  }

  private generateAnomalyDescription(record: CostRecord, deviationPercentage: number): string {
    const isIncrease = deviationPercentage > 0;
    const absDeviation = Math.abs(deviationPercentage);
    
    if (isIncrease) {
      if (absDeviation > 200) {
        return `Critical cost spike detected - ${record.resourceName} costs increased by ${absDeviation.toFixed(1)}%. Possible causes: resource scaling, configuration changes, or billing errors.`;
      } else if (absDeviation > 100) {
        return `Significant cost increase detected - ${record.resourceName} costs increased by ${absDeviation.toFixed(1)}%. Review recent changes and usage patterns.`;
      } else {
        return `Moderate cost increase detected - ${record.resourceName} costs increased by ${absDeviation.toFixed(1)}%. Monitor for continued trend.`;
      }
    } else {
      return `Unusual cost decrease detected - ${record.resourceName} costs decreased by ${absDeviation.toFixed(1)}%. Verify resource is functioning correctly.`;
    }
  }
}