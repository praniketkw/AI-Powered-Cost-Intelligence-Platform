'use client'

import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatCurrency, getTrendColor } from '@/lib/mockData'

interface Department {
  name: string
  currentSpend: number
  budget: number
  trend: 'up' | 'down' | 'stable'
  wastePercentage: number
}

interface DepartmentBreakdownProps {
  departments: Department[]
}

/**
 * Department Breakdown Component
 * 
 * This shows how much each department/team is spending:
 * 1. Current spend vs budget for each team
 * 2. Which teams are over/under budget
 * 3. Waste percentage for each team
 * 4. Trends (spending more or less than usual)
 * 
 * Think of it like a report card for each team's spending
 */

export function DepartmentBreakdown({ departments }: DepartmentBreakdownProps) {
  // Sort departments by current spend (highest first)
  const sortedDepartments = [...departments].sort((a, b) => b.currentSpend - a.currentSpend)
  
  // Calculate totals
  const totalSpend = departments.reduce((sum, dept) => sum + dept.currentSpend, 0)
  const totalBudget = departments.reduce((sum, dept) => sum + dept.budget, 0)
  const overBudgetCount = departments.filter(dept => dept.currentSpend > dept.budget).length

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-danger-600" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-success-600" />
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-600" />
      default:
        return null
    }
  }

  const getBudgetStatus = (currentSpend: number, budget: number) => {
    const percentage = (currentSpend / budget) * 100
    if (percentage > 100) {
      return {
        status: 'over',
        color: 'text-danger-600 bg-danger-50',
        icon: <AlertTriangle className="w-4 h-4" />,
        text: `${(percentage - 100).toFixed(1)}% over`
      }
    } else if (percentage > 90) {
      return {
        status: 'warning',
        color: 'text-warning-600 bg-warning-50',
        icon: <AlertTriangle className="w-4 h-4" />,
        text: `${percentage.toFixed(1)}% used`
      }
    } else {
      return {
        status: 'good',
        color: 'text-success-600 bg-success-50',
        icon: <CheckCircle className="w-4 h-4" />,
        text: `${percentage.toFixed(1)}% used`
      }
    }
  }

  const getWasteColor = (wastePercentage: number) => {
    if (wastePercentage > 30) return 'text-danger-600'
    if (wastePercentage > 20) return 'text-warning-600'
    return 'text-success-600'
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Department Breakdown</h3>
          <p className="text-sm text-gray-600">
            Spending analysis by team and department
          </p>
        </div>

        {/* Summary stats */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-success-500 rounded-full"></div>
            <span className="text-gray-600">
              {departments.length - overBudgetCount} on budget
            </span>
          </div>
          {overBudgetCount > 0 && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-danger-500 rounded-full"></div>
              <span className="text-gray-600">
                {overBudgetCount} over budget
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Department list */}
      <div className="space-y-4">
        {sortedDepartments.map((department, index) => {
          const budgetStatus = getBudgetStatus(department.currentSpend, department.budget)
          const spendPercentage = (department.currentSpend / totalSpend) * 100
          const budgetUtilization = (department.currentSpend / department.budget) * 100

          return (
            <div
              key={department.name}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Department header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h4 className="font-semibold text-gray-900">{department.name}</h4>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${budgetStatus.color}`}>
                    {budgetStatus.icon}
                    <span>{budgetStatus.text}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getTrendIcon(department.trend)}
                  <span className="text-sm text-gray-600">
                    {spendPercentage.toFixed(1)}% of total
                  </span>
                </div>
              </div>

              {/* Spending details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <div className="text-sm text-gray-600">Current Spend</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(department.currentSpend)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Budget</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(department.budget)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Remaining</div>
                  <div className={`text-lg font-semibold ${
                    department.budget - department.currentSpend >= 0 ? 'text-success-600' : 'text-danger-600'
                  }`}>
                    {formatCurrency(department.budget - department.currentSpend)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Waste Identified</div>
                  <div className={`text-lg font-semibold ${getWasteColor(department.wastePercentage)}`}>
                    {department.wastePercentage}%
                  </div>
                </div>
              </div>

              {/* Budget utilization bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Budget Utilization</span>
                  <span className="font-medium">{budgetUtilization.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      budgetUtilization > 100 ? 'bg-danger-500' :
                      budgetUtilization > 90 ? 'bg-warning-500' :
                      'bg-success-500'
                    }`}
                    style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                  ></div>
                  {budgetUtilization > 100 && (
                    <div className="text-xs text-danger-600 mt-1">
                      Over budget by {formatCurrency(department.currentSpend - department.budget)}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex space-x-2">
                  <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                    View Details
                  </button>
                  <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                    Optimize
                  </button>
                </div>

                {department.wastePercentage > 25 && (
                  <div className="text-xs text-warning-600 font-medium">
                    High waste detected - Review recommended
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(totalSpend)}
            </div>
            <div className="text-sm text-gray-600">Total Spend</div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(totalBudget)}
            </div>
            <div className="text-sm text-gray-600">Total Budget</div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className={`text-lg font-semibold ${
              totalSpend <= totalBudget ? 'text-success-600' : 'text-danger-600'
            }`}>
              {((totalSpend / totalBudget) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Budget Utilization</div>
          </div>
        </div>
      </div>
    </div>
  )
}