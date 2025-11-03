import { ENTERPRISE_PROFILE } from './enterprise-profile';

/**
 * Generates realistic Azure cost data for a large-scale SaaS platform
 * Based on actual enterprise spending patterns and usage metrics
 */

export interface CostRecord {
  subscriptionId: string;
  subscriptionName: string;
  resourceGroup: string;
  resourceName: string;
  resourceType: string;
  location: string;
  department: string;
  team: string;
  environment: 'prod' | 'staging' | 'dev';
  date: string;
  cost: number;
  currency: string;
  billingPeriod: string;
  tags: Record<string, string>;
  usageQuantity: number;
  usageUnit: string;
}

export class EnterpriseAzureCostGenerator {
  private readonly baseDate = new Date('2024-01-01');
  private readonly regions = ENTERPRISE_PROFILE.infrastructure.regions;
  private readonly departments = ENTERPRISE_PROFILE.departments;

  /**
   * Azure service types with realistic pricing patterns
   */
  private readonly serviceTypes = [
    // Compute Services
    { type: 'Microsoft.Compute/virtualMachines', baseHourlyCost: 0.45, scaleFactor: 1.0 },
    { type: 'Microsoft.ContainerService/managedClusters', baseHourlyCost: 0.10, scaleFactor: 2.5 },
    { type: 'Microsoft.Web/sites', baseHourlyCost: 0.08, scaleFactor: 1.2 },
    
    // Storage Services
    { type: 'Microsoft.Storage/storageAccounts', baseHourlyCost: 0.02, scaleFactor: 3.0 },
    { type: 'Microsoft.DocumentDB/databaseAccounts', baseHourlyCost: 0.25, scaleFactor: 1.8 },
    { type: 'Microsoft.Sql/servers/databases', baseHourlyCost: 0.15, scaleFactor: 1.5 },
    
    // Networking
    { type: 'Microsoft.Network/applicationGateways', baseHourlyCost: 0.025, scaleFactor: 1.0 },
    { type: 'Microsoft.Cdn/profiles', baseHourlyCost: 0.05, scaleFactor: 4.0 },
    { type: 'Microsoft.Network/loadBalancers', baseHourlyCost: 0.025, scaleFactor: 1.0 },
    
    // AI/ML Services
    { type: 'Microsoft.MachineLearningServices/workspaces', baseHourlyCost: 0.35, scaleFactor: 2.0 },
    { type: 'Microsoft.CognitiveServices/accounts', baseHourlyCost: 0.12, scaleFactor: 1.5 },
    
    // Analytics & Data
    { type: 'Microsoft.EventHub/namespaces', baseHourlyCost: 0.08, scaleFactor: 2.0 },
    { type: 'Microsoft.Synapse/workspaces', baseHourlyCost: 0.20, scaleFactor: 1.8 },
    { type: 'Microsoft.DataFactory/factories', baseHourlyCost: 0.06, scaleFactor: 1.3 },
    
    // Monitoring & Security
    { type: 'Microsoft.OperationalInsights/workspaces', baseHourlyCost: 0.03, scaleFactor: 1.0 },
    { type: 'Microsoft.KeyVault/vaults', baseHourlyCost: 0.01, scaleFactor: 1.0 },
    { type: 'Microsoft.Security/securitySolutions', baseHourlyCost: 0.02, scaleFactor: 1.0 }
  ];

  /**
   * Generate realistic cost data for a specific time period
   */
  generateCostData(startDate: Date, endDate: Date): CostRecord[] {
    const records: CostRecord[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Generate daily records for each department
      this.departments.forEach(dept => {
        const dailyRecords = this.generateDepartmentDailyCosts(dept, currentDate);
        records.push(...dailyRecords);
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return records;
  }

  private generateDepartmentDailyCosts(department: any, date: Date): CostRecord[] {
    const records: CostRecord[] = [];
    const dailyBudget = department.monthlyBudget / 30;
    
    // Generate resources for each team in the department
    department.teams.forEach((team: string, teamIndex: number) => {
      const teamBudget = dailyBudget / department.teams.length;
      const resourceCount = Math.floor(Math.random() * 15) + 5; // 5-20 resources per team
      
      for (let i = 0; i < resourceCount; i++) {
        const serviceType = this.getRandomServiceType(department.primaryServices);
        const environment = this.getEnvironmentForResource(i, resourceCount);
        const region = this.regions[Math.floor(Math.random() * this.regions.length)];
        
        const baseCost = this.calculateResourceCost(serviceType, environment, date);
        const actualCost = this.applyRealisticVariation(baseCost, date);
        
        records.push({
          subscriptionId: this.generateSubscriptionId(department.name, teamIndex),
          subscriptionName: `${department.name}-${team}-${environment}`,
          resourceGroup: `rg-${team.toLowerCase().replace(/\s+/g, '-')}-${environment}`,
          resourceName: `${this.getResourcePrefix(serviceType.type)}-${team.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
          resourceType: serviceType.type,
          location: region,
          department: department.name,
          team: team,
          environment: environment,
          date: date.toISOString().split('T')[0],
          cost: actualCost,
          currency: 'USD',
          billingPeriod: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          tags: {
            Department: department.name,
            Team: team,
            Environment: environment,
            CostCenter: this.generateCostCenter(department.name),
            Owner: this.generateOwnerEmail(team),
            Project: this.generateProjectName(team)
          },
          usageQuantity: this.calculateUsageQuantity(serviceType.type, actualCost),
          usageUnit: this.getUsageUnit(serviceType.type)
        });
      }
    });

    return records;
  }

  private getRandomServiceType(primaryServices: string[]) {
    // 70% chance to use primary services, 30% chance for any service
    if (Math.random() < 0.7 && primaryServices.length > 0) {
      const serviceName = primaryServices[Math.floor(Math.random() * primaryServices.length)];
      const matchingService = this.serviceTypes.find(s => 
        s.type.toLowerCase().includes(serviceName.toLowerCase().replace(/\s+/g, ''))
      );
      return matchingService || this.serviceTypes[Math.floor(Math.random() * this.serviceTypes.length)];
    }
    
    return this.serviceTypes[Math.floor(Math.random() * this.serviceTypes.length)];
  }

  private getEnvironmentForResource(index: number, total: number): 'prod' | 'staging' | 'dev' {
    // Realistic distribution: 60% prod, 25% staging, 15% dev
    const ratio = index / total;
    if (ratio < 0.6) return 'prod';
    if (ratio < 0.85) return 'staging';
    return 'dev';
  }

  private calculateResourceCost(serviceType: any, environment: string, date: Date): number {
    let baseCost = serviceType.baseHourlyCost * 24; // Daily cost
    
    // Environment multipliers
    const envMultipliers = { prod: 1.0, staging: 0.4, dev: 0.2 };
    baseCost *= envMultipliers[environment as keyof typeof envMultipliers];
    
    // Apply scale factor for high-usage services
    baseCost *= serviceType.scaleFactor;
    
    // Apply seasonal variations
    baseCost *= this.getSeasonalMultiplier(date);
    
    // Apply weekly patterns (weekends higher for streaming)
    baseCost *= this.getWeeklyMultiplier(date);
    
    return baseCost;
  }

  private applyRealisticVariation(baseCost: number, date: Date): number {
    // Add realistic daily variation (±20%)
    const variation = (Math.random() - 0.5) * 0.4;
    let cost = baseCost * (1 + variation);
    
    // Add occasional cost spikes (5% chance of 2-5x spike)
    if (Math.random() < 0.05) {
      cost *= (2 + Math.random() * 3);
    }
    
    // Round to realistic precision
    return Math.round(cost * 100) / 100;
  }

  private getSeasonalMultiplier(date: Date): number {
    const month = date.getMonth();
    // Higher usage in Dec, Jan (holidays), July, Aug (summer)
    const seasonalMultipliers = [
      1.2, 0.9, 0.9, 1.0, 1.0, 1.0,  // Jan-Jun
      1.3, 1.3, 0.9, 1.0, 1.0, 1.2   // Jul-Dec
    ];
    return seasonalMultipliers[month];
  }

  private getWeeklyMultiplier(date: Date): number {
    const dayOfWeek = date.getDay();
    // Higher weekend usage for streaming platform
    return dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1.0;
  }

  private generateSubscriptionId(deptName: string, teamIndex: number): string {
    const hash = this.simpleHash(deptName + teamIndex);
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  private generateCostCenter(deptName: string): string {
    const costCenters: Record<string, string> = {
      'Core Platform': 'CC-1001',
      'Data & ML': 'CC-1002',
      'User Experience': 'CC-1003',
      'Infrastructure': 'CC-1004',
      'Content & Licensing': 'CC-1005',
      'Business Intelligence': 'CC-1006'
    };
    return costCenters[deptName] || 'CC-9999';
  }

  private generateOwnerEmail(team: string): string {
    const teamLead = team.toLowerCase().replace(/\s+/g, '.');
    return `${teamLead}.lead@streamflow.com`;
  }

  private generateProjectName(team: string): string {
    const projects: Record<string, string[]> = {
      'Audio Processing': ['audio-pipeline-v3', 'codec-optimization', 'quality-enhancement'],
      'Streaming Infrastructure': ['global-cdn', 'edge-computing', 'latency-reduction'],
      'Recommendation Engine': ['ml-personalization', 'discovery-algorithm', 'user-modeling'],
      'Analytics': ['real-time-metrics', 'user-behavior', 'performance-monitoring'],
      'Mobile Apps': ['ios-app-v5', 'android-optimization', 'cross-platform'],
      'Web Platform': ['web-player-v4', 'pwa-enhancement', 'accessibility'],
      'API Gateway': ['api-v2-migration', 'rate-limiting', 'security-hardening'],
      'DevOps': ['ci-cd-pipeline', 'infrastructure-automation', 'monitoring-stack'],
      'Security': ['zero-trust', 'compliance-automation', 'threat-detection']
    };
    
    const teamProjects = projects[team] || ['general-project'];
    return teamProjects[Math.floor(Math.random() * teamProjects.length)];
  }

  private getResourcePrefix(resourceType: string): string {
    const prefixes: Record<string, string> = {
      'Microsoft.Compute/virtualMachines': 'vm',
      'Microsoft.ContainerService/managedClusters': 'aks',
      'Microsoft.Web/sites': 'app',
      'Microsoft.Storage/storageAccounts': 'st',
      'Microsoft.DocumentDB/databaseAccounts': 'cosmos',
      'Microsoft.Sql/servers/databases': 'sqldb',
      'Microsoft.Network/applicationGateways': 'agw',
      'Microsoft.Cdn/profiles': 'cdn',
      'Microsoft.MachineLearningServices/workspaces': 'mlw',
      'Microsoft.EventHub/namespaces': 'evh'
    };
    
    return prefixes[resourceType] || 'res';
  }

  private calculateUsageQuantity(resourceType: string, cost: number): number {
    // Estimate usage based on cost and typical pricing
    const usageEstimates: Record<string, number> = {
      'Microsoft.Compute/virtualMachines': cost / 0.45, // Hours
      'Microsoft.Storage/storageAccounts': cost / 0.02 * 100, // GB
      'Microsoft.Cdn/profiles': cost / 0.05 * 1000, // GB transferred
      'Microsoft.Sql/servers/databases': cost / 0.15, // DTU hours
    };
    
    return Math.round((usageEstimates[resourceType] || cost * 10) * 100) / 100;
  }

  private getUsageUnit(resourceType: string): string {
    const units: Record<string, string> = {
      'Microsoft.Compute/virtualMachines': 'Hours',
      'Microsoft.Storage/storageAccounts': 'GB',
      'Microsoft.Cdn/profiles': 'GB',
      'Microsoft.Sql/servers/databases': 'DTU Hours',
      'Microsoft.Network/applicationGateways': 'Hours',
      'Microsoft.MachineLearningServices/workspaces': 'Compute Hours'
    };
    
    return units[resourceType] || 'Units';
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  }
}

// Export singleton instance
export const costGenerator = new EnterpriseAzureCostGenerator();