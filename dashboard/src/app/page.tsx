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
import { useApi, transformCostDataForDashboard } from '@/lib/api'

/**
 * Main Dashboard Page - Now Connected to Real Azure Data!
 * 
 * This dashboard now displays:
 * 1. Real Azure cost data from your subscription
 * 2. AI-powered insights from Claude
 * 3. Live cost analysis and predictions
 * 4. Actual department breakdowns from Azure
 */

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(mockDashboardData)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')
  const [dataSource, setDataSource] = useState<'loading' | 'azure' | 'mock'>('loading')
  const [error, setError] = useState<string | null>(null)
  
  const api = useApi()

  // Load real Azure data with AI analysis
  useEffect(() => {
    const loadRealData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        console.log('🔄 Loading real Azure cost data...')
        
        // First check if backend is healthy
        const healthCheck = await api.getHealth()
        console.log('✅ Backend health:', healthCheck.data)
        
        // Get full analysis (Azure data + AI insights)
        const fullAnalysis = await api.getFullAnalysis()
        console.log('📊 Full analysis received:', fullAnalysis.data)
        
        if (fullAnalysis.success) {
          // Transform API data to dashboard format
          const transformedData = transformCostDataForDashboard(fullAnalysis.data)
          
          // Add metadata for display
          transformedData.metadata = {
            subscriptionId: fullAnalysis.data.metadata.subscriptionId,
            dateRange: fullAnalysis.data.metadata.dateRange,
            tokensUsed: fullAnalysis.data.metadata.tokensUsed,
            recordCount: fullAnalysis.data.azureData.records,
            totalCost: fullAnalysis.data.azureData.totalCost,
            aiConfidence: fullAnalysis.data.aiAnalysis.confidence,
          }
          
          setDashboardData(transformedData)
          setDataSource('azure')
          console.log('✅ Real Azure data loaded successfully!')
        } else {
          throw new Error(fullAnalysis.error || 'Failed to load data')
        }
        
      } catch (err) {
        console.error('❌ Failed to load real data, falling back to mock:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setDashboardData(mockDashboardData)
        setDataSource('mock')
      } finally {
        setIsLoading(false)
      }
    }

    loadRealData()
  }, [selectedTimeframe])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading real Azure cost data...</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to your Azure subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Data Source Indicator */}
      <div className={`px-4 py-2 text-sm ${
        dataSource === 'azure' 
          ? 'bg-green-100 text-green-800 border-b border-green-200' 
          : dataSource === 'mock'
          ? 'bg-yellow-100 text-yellow-800 border-b border-yellow-200'
          : 'bg-blue-100 text-blue-800 border-b border-blue-200'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {dataSource === 'azure' && (
              <>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span>✅ Live Azure Data - Subscription: {dashboardData.metadata?.subscriptionId?.slice(-8)}</span>
                <span className="text-xs">
                  ({dashboardData.metadata?.recordCount} records, ${dashboardData.metadata?.totalCost?.toFixed(2)} total)
                </span>
              </>
            )}
            {dataSource === 'mock' && (
              <>
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span>⚠️ Mock Data Mode</span>
                {error && <span className="text-xs">- {error}</span>}
              </>
            )}
          </div>
          {dashboardData.metadata?.aiConfidence && (
            <span className="text-xs">
              AI Confidence: {(dashboardData.metadata.aiConfidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

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

            {/* Interactive query interface - now with real AI */}
            <InteractiveQuery />
          </div>

          {/* Right column - Alerts and insights */}
          <div className="space-y-8">
            {/* Real-time alerts from AI analysis */}
            <AlertsPanel 
              alerts={dashboardData.alerts}
            />

            {/* AI-powered predictive insights */}
            <PredictiveInsights 
              predictions={dashboardData.predictions}
            />
          </div>
        </div>

        {/* Azure Integration Status */}
        {dataSource === 'azure' && dashboardData.metadata && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Azure Integration Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Subscription:</span>
                <p className="font-mono text-xs">{dashboardData.metadata.subscriptionId}</p>
              </div>
              <div>
                <span className="text-gray-500">Date Range:</span>
                <p>{dashboardData.metadata.dateRange.start} to {dashboardData.metadata.dateRange.end}</p>
              </div>
              <div>
                <span className="text-gray-500">AI Tokens Used:</span>
                <p>{dashboardData.metadata.tokensUsed} (~$0.0001)</p>
              </div>
              <div>
                <span className="text-gray-500">Last Updated:</span>
                <p>{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}