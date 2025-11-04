'use client'

import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Target, Zap } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/mockData'

interface MetricsOverviewProps {
  metrics: {
    totalSpend: number
    monthlyBudget: number
    predictedSpend: number
    wasteIdentified: number
    savingsOpportunity: number
    alertsCount: number
  }
  timeframe: string
}

/**
 * Metrics Overview Component
 * 
 * This shows the "big picture" numbers that executives and managers care about:
 * 1. How much we're spending vs. budget
 * 2. How much money we're wasting
 * 3. How much we could save
 * 4. How many issues need attention
 * 
 * Think of this like a financial summary - the key numbers that tell the story
 */

export function MetricsOverview({ metrics, timeframe }: MetricsOverviewProps) {
  // Calculate key percentages and trends
  const budgetUtilization = (metrics.totalSpend / metrics.monthlyBudget) * 100
  const wastePercentage = (metrics.wasteIdentified / metrics.totalSpend) * 100
  const savingsPercentage = (metrics.savingsOpportunity / metrics.totalSpend) * 100
  const budgetOverrun = metrics.predictedSpend - metrics.monthlyBudget
  const isOverBudget = budgetOverrun > 0

  const metricCards = [
    {
      title: 'Current Spend',
      value: formatCurrency(metrics.totalSpend),
      subtitle: `${budgetUtilization.toFixed(1)}% of monthly budget`,
      icon: DollarSign,
      trend: isOverBudget ? 'up' : 'stable',
      trendValue: isOverBudget ? `+${formatPercentage((budgetOverrun / metrics.monthlyBudget) * 100)}` : 'On track',
      color: isOverBudget ? 'danger' : budgetUtilization > 80 ? 'warning' : 'success'
    },
    {
      title: 'Predicted Month-End',
      value: formatCurrency(metrics.predictedSpend),
      subtitle: `vs ${formatCurrency(metrics.monthlyBudget)} budget`,
      icon: Target,
      trend: isOverBudget ? 'up' : 'down',
      trendValue: isOverBudget ? `Over by ${formatCurrency(budgetOverrun)}` : 'Under budget',
      color: isOverBudget ? 'danger' : 'success'
    },
    {
      title: 'Waste Identified',
      value: formatCurrency(metrics.wasteIdentified),
      subtitle: `${wastePercentage.toFixed(1)}% of total spend`,
      icon: AlertTriangle,
      trend: 'up',
      trendValue: `${wastePercentage.toFixed(1)}% waste ratio`,
      color: wastePercentage > 30 ? 'danger' : wastePercentage > 20 ? 'warning' : 'success'
    },
    {
      title: 'Savings Opportunity',
      value: formatCurrency(metrics.savingsOpportunity),
      subtitle: `${savingsPercentage.toFixed(1)}% potential savings`,
      icon: Zap,
      trend: 'down',
      trendValue: `${savingsPercentage.toFixed(1)}% recoverable`,
      color: 'success'
    }
  ]

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'success':
        return {
          bg: 'bg-success-50',
          icon: 'text-success-600',
          text: 'text-success-600',
          border: 'border-success-200'
        }
      case 'warning':
        return {
          bg: 'bg-warning-50',
          icon: 'text-warning-600',
          text: 'text-warning-600',
          border: 'border-warning-200'
        }
      case 'danger':
        return {
          bg: 'bg-danger-50',
          icon: 'text-danger-600',
          text: 'text-danger-600',
          border: 'border-danger-200'
        }
      default:
        return {
          bg: 'bg-gray-50',
          icon: 'text-gray-600',
          text: 'text-gray-600',
          border: 'border-gray-200'
        }
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />
      case 'down':
        return <TrendingDown className="w-4 h-4" />
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-400"></div>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cost Intelligence Overview</h2>
          <p className="text-gray-600 mt-1">
            Real-time insights for {timeframe === '24h' ? 'the last 24 hours' : 
                                   timeframe === '7d' ? 'the last 7 days' : 
                                   timeframe === '30d' ? 'the last 30 days' : 
                                   'the last 90 days'}
          </p>
        </div>
        
        {/* Quick status indicator */}
        <div className="flex items-center space-x-2">
          {metrics.alertsCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-warning-50 rounded-full border border-warning-200">
              <AlertTriangle className="w-4 h-4 text-warning-600" />
              <span className="text-sm font-medium text-warning-700">
                {metrics.alertsCount} active alerts
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => {
          const colors = getColorClasses(metric.color)
          const Icon = metric.icon
          
          return (
            <div
              key={metric.title}
              className={`metric-card border-l-4 ${colors.border} ${colors.bg} animate-fade-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Header with icon */}
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <div className={`flex items-center space-x-1 ${colors.text}`}>
                  {getTrendIcon(metric.trend)}
                </div>
              </div>

              {/* Main value */}
              <div className="mb-2">
                <div className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </div>
                <div className="text-sm text-gray-600">
                  {metric.subtitle}
                </div>
              </div>

              {/* Trend indicator */}
              <div className={`text-sm font-medium ${colors.text}`}>
                {metric.trendValue}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {((metrics.savingsOpportunity / metrics.totalSpend) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Potential cost reduction</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round((metrics.wasteIdentified / (metrics.totalSpend / 30)))} days
            </div>
            <div className="text-sm text-gray-600">Worth of waste identified</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              ${Math.round(metrics.savingsOpportunity * 12 / 1000)}k
            </div>
            <div className="text-sm text-gray-600">Annual savings potential</div>
          </div>
        </div>
      </div>
    </div>
  )
}