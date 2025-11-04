/**
 * Mock Data for Cost Intelligence Dashboard
 * 
 * This simulates real enterprise cost data that our AI would analyze.
 * Based on our research, this represents a company spending ~$5M annually on cloud.
 */

export interface DashboardData {
  overview: {
    totalSpend: number
    monthlyBudget: number
    predictedSpend: number
    wasteIdentified: number
    savingsOpportunity: number
    alertsCount: number
  }
  costTrends: Array<{
    date: string
    actual: number
    predicted: number
    budget: number
  }>
  departmentBreakdown: Array<{
    name: string
    currentSpend: number
    budget: number
    trend: 'up' | 'down' | 'stable'
    wastePercentage: number
  }>
  alerts: Array<{
    id: string
    type: 'critical' | 'warning' | 'info'
    title: string
    description: string
    impact: number
    timeAgo: string
    department: string
  }>
  predictions: Array<{
    type: 'cost_spike' | 'budget_risk' | 'optimization_opportunity'
    title: string
    description: string
    confidence: number
    timeframe: string
    impact: number
  }>
}

// Generate realistic cost trends for the last 30 days
const generateCostTrends = () => {
  const trends = []
  const baseDaily = 13700 // ~$5M annually / 365 days
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    // Add realistic variations
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const weekendMultiplier = isWeekend ? 0.7 : 1.0 // Lower weekend usage
    
    // Add some randomness and trends
    const randomVariation = (Math.random() - 0.5) * 0.3 // ±15% variation
    const trendMultiplier = 1 + (29 - i) * 0.002 // Slight upward trend
    
    const actual = Math.round(baseDaily * weekendMultiplier * trendMultiplier * (1 + randomVariation))
    const predicted = Math.round(actual * (0.95 + Math.random() * 0.1)) // Prediction accuracy
    const budget = Math.round(baseDaily * 1.1) // 10% buffer in budget
    
    trends.push({
      date: date.toISOString().split('T')[0],
      actual,
      predicted,
      budget
    })
  }
  
  return trends
}

export const mockDashboardData: DashboardData = {
  overview: {
    totalSpend: 387420, // Current month spend so far
    monthlyBudget: 416667, // $5M annually / 12 months
    predictedSpend: 425300, // Predicted month-end spend (over budget!)
    wasteIdentified: 124500, // 32% waste identified
    savingsOpportunity: 145800, // Potential savings with our platform
    alertsCount: 7
  },

  costTrends: generateCostTrends(),

  departmentBreakdown: [
    {
      name: 'Core Platform',
      currentSpend: 162800,
      budget: 145833, // Over budget
      trend: 'up',
      wastePercentage: 28
    },
    {
      name: 'Data & ML',
      currentSpend: 98200,
      budget: 116667,
      trend: 'stable',
      wastePercentage: 35
    },
    {
      name: 'User Experience',
      currentSpend: 67300,
      budget: 75000,
      trend: 'down',
      wastePercentage: 22
    },
    {
      name: 'Infrastructure',
      currentSpend: 45600,
      budget: 58333,
      trend: 'stable',
      wastePercentage: 40
    },
    {
      name: 'Content & Licensing',
      currentSpend: 8920,
      budget: 12500,
      trend: 'down',
      wastePercentage: 15
    },
    {
      name: 'Business Intelligence',
      currentSpend: 4600,
      budget: 8333,
      trend: 'stable',
      wastePercentage: 25
    }
  ],

  alerts: [
    {
      id: 'alert-1',
      type: 'critical',
      title: 'Budget Overrun Predicted',
      description: 'Core Platform department is projected to exceed monthly budget by $17k based on current trends.',
      impact: 17000,
      timeAgo: '2 hours ago',
      department: 'Core Platform'
    },
    {
      id: 'alert-2',
      type: 'warning',
      title: 'Unusual Cost Spike Detected',
      description: 'Data & ML team costs increased 45% in the last 4 hours. Likely related to new model training job.',
      impact: 8500,
      timeAgo: '4 hours ago',
      department: 'Data & ML'
    },
    {
      id: 'alert-3',
      type: 'critical',
      title: 'Idle Resources Found',
      description: '23 development environments have been running unused for >72 hours, costing $340/day.',
      impact: 10200,
      timeAgo: '6 hours ago',
      department: 'Infrastructure'
    },
    {
      id: 'alert-4',
      type: 'warning',
      title: 'Storage Optimization Opportunity',
      description: 'Content team has 2.3TB of data on premium storage that could be moved to archive tier.',
      impact: 4200,
      timeAgo: '8 hours ago',
      department: 'Content & Licensing'
    },
    {
      id: 'alert-5',
      type: 'info',
      title: 'Reserved Instance Recommendation',
      description: 'UX team has consistent compute usage that could save $2.1k/month with reserved instances.',
      impact: 2100,
      timeAgo: '12 hours ago',
      department: 'User Experience'
    },
    {
      id: 'alert-6',
      type: 'warning',
      title: 'Auto-Scaling Misconfiguration',
      description: 'Platform services are not scaling down during low-traffic periods, wasting $180/day.',
      impact: 5400,
      timeAgo: '1 day ago',
      department: 'Core Platform'
    },
    {
      id: 'alert-7',
      type: 'info',
      title: 'Cost Efficiency Improved',
      description: 'BI team successfully implemented storage lifecycle policies, saving $800/month.',
      impact: -800,
      timeAgo: '2 days ago',
      department: 'Business Intelligence'
    }
  ],

  predictions: [
    {
      type: 'budget_risk',
      title: 'Monthly Budget Risk',
      description: 'Current spending trajectory will exceed monthly budget by 2.1% ($8.7k) if no action is taken.',
      confidence: 0.87,
      timeframe: 'End of month',
      impact: 8700
    },
    {
      type: 'cost_spike',
      title: 'Predicted Cost Spike',
      description: 'ML model training scheduled for tomorrow will likely increase daily costs by $3.2k for 2-3 days.',
      confidence: 0.92,
      timeframe: 'Tomorrow 9 AM',
      impact: 9600
    },
    {
      type: 'optimization_opportunity',
      title: 'Immediate Savings Available',
      description: 'Implementing recommended optimizations could save $12.4k this month with minimal risk.',
      confidence: 0.94,
      timeframe: 'This week',
      impact: -12400
    }
  ]
}

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  } else if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`
  } else {
    return `$${amount.toLocaleString()}`
  }
}

// Helper function to format percentage
export const formatPercentage = (value: number): string => {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

// Helper function to get trend color
export const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up': return 'text-danger-600'
    case 'down': return 'text-success-600'
    case 'stable': return 'text-gray-600'
  }
}

// Helper function to get alert color classes
export const getAlertClasses = (type: 'critical' | 'warning' | 'info'): string => {
  switch (type) {
    case 'critical': return 'alert-critical'
    case 'warning': return 'alert-warning'
    case 'info': return 'alert-info'
  }
}