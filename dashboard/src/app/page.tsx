'use client'

import { useState, useEffect } from 'react'
import { DashboardHeader } from '@/components/DashboardHeader'
import { MetricsOverview } from '@/components/MetricsOverview'
import { CostTrendsChart } from '@/components/CostTrendsChart'
import { AlertsPanel } from '@/components/AlertsPanel'
import { DepartmentBreakdown } from '@/components/DepartmentBreakdown'
import { InteractiveQuery } from '@/components/InteractiveQuery'
import { PredictiveInsights } from '@/components/PredictiveInsights'
import { mockDashboardData } from '@/lib/mockData'

/**
 * Main Dashboard Page
 * 
 * This is the main interface where users see:
 * 1. Overall cost metrics and trends
 * 2. Real-time alerts and predictions
 * 3. Interactive cost analysis
 * 4. Department-wise breakdowns
 * 
 * Think of this like the "home screen" of our cost intelligence platform
 */

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(mockDashboardData)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')

  // Simulate loading real data (in a real app, this would fetch from our API)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      setDashboardData(mockDashboardData)
      setIsLoading(false)
    }

    loadData()
  }, [selectedTimeframe])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cost intelligence data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with navigation and key metrics */}
      <DashboardHeader 
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={setSelectedTimeframe}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top-level metrics overview */}
        <div className="mb-8">
          <MetricsOverview 
            metrics={dashboardData.overview}
            timeframe={selectedTimeframe}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left column - Charts and trends */}
          <div className="lg:col-span-2 space-y-8">
            {/* Cost trends chart */}
            <CostTrendsChart 
              data={dashboardData.costTrends}
              timeframe={selectedTimeframe}
            />

            {/* Department breakdown */}
            <DepartmentBreakdown 
              departments={dashboardData.departmentBreakdown}
            />

            {/* Interactive query interface */}
            <InteractiveQuery />
          </div>

          {/* Right column - Alerts and insights */}
          <div className="space-y-8">
            {/* Real-time alerts */}
            <AlertsPanel 
              alerts={dashboardData.alerts}
            />

            {/* Predictive insights */}
            <PredictiveInsights 
              predictions={dashboardData.predictions}
            />
          </div>
        </div>
      </main>
    </div>
  )
}