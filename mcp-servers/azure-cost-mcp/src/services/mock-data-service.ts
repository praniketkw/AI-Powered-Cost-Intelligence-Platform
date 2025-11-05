/**
 * Mock Data Service for Azure Cost MCP Server
 * Generates realistic cost data for development and testing
 */

export interface MockCostDataParams {
  startDate: string;
  endDate: string;
  department?: string;
  resourceType?: string;
}

export class MockDataService {
  private readonly departments = ['engineering', 'marketing', 'sales', 'operations', 'finance'];
  private readonly services = [
    'Virtual Machines',
    'Storage Accounts',
    'App Service',
    'SQL Database',
    'Azure Functions',
    'Application Gateway',
    'Load Balancer',
    'CDN',
    'Key Vault',
    'Monitor'
  ];
  private readonly regions = ['eastus', 'westus2', 'centralus', 'northeurope', 'southeastasia'];

  generateCostData(params: MockCostDataParams): any[] {
    const { startDate, endDate, department, resourceType } = params;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const costData = [];
    const departments = department ? [department] : this.departments;
    const services = resourceType ? [resourceType] : this.services;

    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + dayOffset);
      const dateString = currentDate.toISOString().split('T')[0];

      for (const dept of departments) {
        for (const service of services) {
          // Generate multiple resources per service per department
          const resourceCount = Math.floor(Math.random() * 3) + 1;
          
          for (let resourceIndex = 0; resourceIndex < resourceCount; resourceIndex++) {
            const baseCost = this.getBaseCostForService(service);
            const departmentMultiplier = this.getDepartmentMultiplier(dept);
            const dailyVariation = 0.8 + (Math.random() * 0.4); // ±20% daily variation
            const weekendReduction = this.isWeekend(currentDate) ? 0.7 : 1.0;
            
            const cost = baseCost * departmentMultiplier * dailyVariation * weekendReduction;

            costData.push({
              id: `cost-${dateString}-${dept}-${service}-${resourceIndex}-${Math.random().toString(36).substr(2, 9)}`,
              date: dateString,
              cost: Math.round(cost * 100) / 100, // Round to 2 decimal places
              currency: 'USD',
              resourceGroup: `rg-${dept}-${this.getEnvironment()}`,
              serviceName: service,
              resourceType: this.getResourceType(service),
              department: dept,
              subscriptionId: this.generateSubscriptionId(dept),
              tags: this.generateTags(dept, service),
              metadata: this.generateMetadata(service, this.regions[Math.floor(Math.random() * this.regions.length)])
            });
          }
        }
      }
    }

    return costData;
  }

  private getBaseCostForService(service: string): number {
    const baseCosts: Record<string, number> = {
      'Virtual Machines': 150,
      'Storage Accounts': 25,
      'App Service': 80,
      'SQL Database': 200,
      'Azure Functions': 15,
      'Application Gateway': 60,
      'Load Balancer': 40,
      'CDN': 30,
      'Key Vault': 5,
      'Monitor': 20
    };

    return baseCosts[service] || 50;
  }

  private getDepartmentMultiplier(department: string): number {
    const multipliers: Record<string, number> = {
      'engineering': 2.5,
      'marketing': 1.2,
      'sales': 0.8,
      'operations': 1.5,
      'finance': 0.6
    };

    return multipliers[department] || 1.0;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  private getEnvironment(): string {
    const environments = ['prod', 'staging', 'dev'];
    const weights = [0.6, 0.25, 0.15]; // Production gets more resources
    
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < environments.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return environments[i];
      }
    }
    
    return 'prod';
  }

  private getResourceType(service: string): string {
    const resourceTypes: Record<string, string> = {
      'Virtual Machines': 'Microsoft.Compute/virtualMachines',
      'Storage Accounts': 'Microsoft.Storage/storageAccounts',
      'App Service': 'Microsoft.Web/sites',
      'SQL Database': 'Microsoft.Sql/servers/databases',
      'Azure Functions': 'Microsoft.Web/sites',
      'Application Gateway': 'Microsoft.Network/applicationGateways',
      'Load Balancer': 'Microsoft.Network/loadBalancers',
      'CDN': 'Microsoft.Cdn/profiles',
      'Key Vault': 'Microsoft.KeyVault/vaults',
      'Monitor': 'Microsoft.Insights/components'
    };

    return resourceTypes[service] || 'Microsoft.Resources/unknown';
  }

  private generateSubscriptionId(department: string): string {
    // Generate consistent subscription IDs per department
    const subscriptionMap: Record<string, string> = {
      'engineering': 'sub-eng-12345678-1234-1234-1234-123456789012',
      'marketing': 'sub-mkt-87654321-4321-4321-4321-210987654321',
      'sales': 'sub-sls-11111111-2222-3333-4444-555555555555',
      'operations': 'sub-ops-99999999-8888-7777-6666-555555555555',
      'finance': 'sub-fin-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    };

    return subscriptionMap[department] || 'sub-default-00000000-0000-0000-0000-000000000000';
  }

  private generateTags(department: string, service: string): Record<string, string> {
    const environments = ['production', 'staging', 'development'];
    const teams = {
      'engineering': ['backend', 'frontend', 'devops', 'mobile'],
      'marketing': ['digital', 'content', 'analytics'],
      'sales': ['enterprise', 'smb', 'support'],
      'operations': ['infrastructure', 'security', 'compliance'],
      'finance': ['accounting', 'planning', 'reporting']
    };

    const environment = environments[Math.floor(Math.random() * environments.length)];
    const team = teams[department] ? 
      teams[department][Math.floor(Math.random() * teams[department].length)] : 
      'general';

    return {
      department,
      team,
      environment,
      service: service.toLowerCase().replace(/\s+/g, '-'),
      'cost-center': `cc-${department}-${Math.floor(Math.random() * 1000) + 1000}`,
      owner: `${team}-team@company.com`,
      'created-by': 'terraform',
      'backup-policy': environment === 'production' ? 'daily' : 'weekly'
    };
  }

  private generateMetadata(service: string, region: string): Record<string, any> {
    const baseMetadata = {
      region,
      billingPeriod: this.getCurrentBillingPeriod(),
      currency: 'USD',
      pricingTier: this.getPricingTier(service)
    };

    // Add service-specific metadata
    switch (service) {
      case 'Virtual Machines':
        return {
          ...baseMetadata,
          vmSize: this.getRandomVmSize(),
          osType: Math.random() > 0.3 ? 'Linux' : 'Windows',
          diskType: Math.random() > 0.5 ? 'Premium_LRS' : 'Standard_LRS',
          meterCategory: 'Virtual Machines',
          meterSubCategory: 'Compute Hours',
          unitOfMeasure: 'Hours',
          quantity: Math.floor(Math.random() * 24) + 1
        };

      case 'Storage Accounts':
        return {
          ...baseMetadata,
          storageType: this.getRandomStorageType(),
          replication: Math.random() > 0.5 ? 'LRS' : 'GRS',
          accessTier: Math.random() > 0.7 ? 'Hot' : 'Cool',
          meterCategory: 'Storage',
          meterSubCategory: 'Data Stored',
          unitOfMeasure: 'GB',
          quantity: Math.floor(Math.random() * 1000) + 100
        };

      case 'SQL Database':
        return {
          ...baseMetadata,
          serviceObjective: this.getRandomSqlTier(),
          edition: 'Standard',
          maxSizeGB: Math.floor(Math.random() * 500) + 100,
          meterCategory: 'SQL Database',
          meterSubCategory: 'Database Hours',
          unitOfMeasure: 'Hours',
          quantity: Math.floor(Math.random() * 24) + 1
        };

      default:
        return {
          ...baseMetadata,
          meterCategory: service,
          meterSubCategory: 'Standard',
          unitOfMeasure: 'Hours',
          quantity: Math.floor(Math.random() * 24) + 1
        };
    }
  }

  private getCurrentBillingPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getPricingTier(service: string): string {
    const tiers = ['Basic', 'Standard', 'Premium'];
    const weights = [0.2, 0.6, 0.2]; // Most resources use Standard tier
    
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < tiers.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return tiers[i];
      }
    }
    
    return 'Standard';
  }

  private getRandomVmSize(): string {
    const sizes = [
      'Standard_B1s', 'Standard_B2s', 'Standard_B4ms',
      'Standard_D2s_v3', 'Standard_D4s_v3', 'Standard_D8s_v3',
      'Standard_F2s_v2', 'Standard_F4s_v2',
      'Standard_E2s_v3', 'Standard_E4s_v3'
    ];
    return sizes[Math.floor(Math.random() * sizes.length)];
  }

  private getRandomStorageType(): string {
    const types = ['Standard_LRS', 'Standard_GRS', 'Premium_LRS', 'Standard_ZRS'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRandomSqlTier(): string {
    const tiers = ['S0', 'S1', 'S2', 'S3', 'P1', 'P2'];
    return tiers[Math.floor(Math.random() * tiers.length)];
  }

  // Additional utility methods for generating realistic patterns
  generateAnomalyData(normalData: any[], anomalyType: 'spike' | 'drop' = 'spike'): any[] {
    const anomalousData = [...normalData];
    const anomalyCount = Math.floor(normalData.length * 0.05); // 5% anomalies
    
    for (let i = 0; i < anomalyCount; i++) {
      const randomIndex = Math.floor(Math.random() * anomalousData.length);
      const originalCost = anomalousData[randomIndex].cost;
      
      if (anomalyType === 'spike') {
        anomalousData[randomIndex].cost = originalCost * (2 + Math.random() * 3); // 2x to 5x increase
      } else {
        anomalousData[randomIndex].cost = originalCost * (0.1 + Math.random() * 0.3); // 10% to 40% of original
      }
      
      // Add anomaly metadata
      anomalousData[randomIndex].metadata = {
        ...anomalousData[randomIndex].metadata,
        anomaly: true,
        anomalyType,
        originalCost
      };
    }
    
    return anomalousData;
  }

  generateSeasonalData(baseData: any[], seasonalPattern: 'holiday' | 'quarter-end' | 'summer'): any[] {
    return baseData.map(record => {
      const date = new Date(record.date);
      let multiplier = 1.0;
      
      switch (seasonalPattern) {
        case 'holiday':
          // Reduced activity during holidays
          if (this.isHolidayPeriod(date)) {
            multiplier = 0.6;
          }
          break;
          
        case 'quarter-end':
          // Increased activity at quarter end
          if (this.isQuarterEnd(date)) {
            multiplier = 1.4;
          }
          break;
          
        case 'summer':
          // Reduced activity during summer months
          const month = date.getMonth();
          if (month >= 5 && month <= 7) { // June, July, August
            multiplier = 0.8;
          }
          break;
      }
      
      return {
        ...record,
        cost: record.cost * multiplier,
        metadata: {
          ...record.metadata,
          seasonalAdjustment: multiplier,
          seasonalPattern
        }
      };
    });
  }

  private isHolidayPeriod(date: Date): boolean {
    const month = date.getMonth();
    const day = date.getDate();
    
    // Christmas/New Year period
    if ((month === 11 && day >= 20) || (month === 0 && day <= 5)) {
      return true;
    }
    
    // Thanksgiving week (US)
    if (month === 10 && day >= 22 && day <= 28) {
      return true;
    }
    
    return false;
  }

  private isQuarterEnd(date: Date): boolean {
    const month = date.getMonth();
    const day = date.getDate();
    
    // Last week of quarters (March, June, September, December)
    if ([2, 5, 8, 11].includes(month) && day >= 25) {
      return true;
    }
    
    return false;
  }
}