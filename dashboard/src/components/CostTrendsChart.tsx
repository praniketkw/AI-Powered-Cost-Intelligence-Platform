'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react'
import { formatCurrency } from '@/lib/mockData'

interface CostTrendsChartProps {
  data: Array<{
    date: string
    actual: number
    predicted: number
    budget: number
  }>
  timeframe: string
}

/**
 * Cost Trends Chart Component
 * 
 * This shows a visual representation of:
 * 1. Actual spending over time (what really happened)
 * 2. Predicted spending (what AI thinks will happen)
 * 3. Budget limits (what you planned to spend)
 * 
 * Think of it like a graph showing your bank account balance over time,
 * but with predictions and budget comparisons
 */

export function CostTrendsChart({ data, timeframe }: CostTrendsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<'actual' | 'predicted' | 'budget'>('actual')
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  // Calculate chart dimensions and scaling
  const chartWidth = 800
  const chartHeight = 300
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  // Find min/max values for scaling
  const allValues = data.flatMap(d => [d.actual, d.predicted, d.budget])
  const minValue = Math.min(...allValues) * 0.95
  const maxValue = Math.max(...allValues) * 1.05

  // Create scale functions
  const xScale = (index: number) => (index / (data.length - 1)) * innerWidth
  const yScale = (value: number) => innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight

  // Generate path strings for each line
  const generatePath = (values: number[]) => {
    return values
      .map((value, index) => {
        const x = xScale(index)
        const y = yScale(value)
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  const actualPath = generatePath(data.map(d => d.actual))
  const predictedPath = generatePath(data.map(d => d.predicted))
  const budgetPath = generatePath(data.map(d => d.budget))

  // Calculate trend
  const firstValue = data[0]?.actual || 0
  const lastValue = data[data.length - 1]?.actual || 0
  const trendPercentage = ((lastValue - firstValue) / firstValue) * 100
  const isIncreasing = trendPercentage > 0

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cost Trends</h3>
          <p className="text-sm text-gray-600">
            Daily spending patterns and predictions
          </p>
        </div>

        {/* Trend indicator */}
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
            isIncreasing ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700'
          }`}>
            {isIncreasing ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {isIncreasing ? '+' : ''}{trendPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {/* Legend */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
              <span>Actual</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-warning-500 rounded-full"></div>
              <span>Predicted</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>Budget</span>
            </div>
          </div>
        </div>

        {/* View options */}
        <div className="flex items-center space-x-2">
          <button className="btn btn-secondary text-xs">
            <Calendar className="w-4 h-4 mr-1" />
            Export
          </button>
          <button className="btn btn-secondary text-xs">
            <BarChart3 className="w-4 h-4 mr-1" />
            Details
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div className="relative bg-gray-50 rounded-lg p-4">
        <svg width={chartWidth} height={chartHeight} className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={innerWidth} height={innerHeight} x={padding.left} y={padding.top} fill="url(#grid)" />

          {/* Chart area */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Budget line (dashed) */}
            <path
              d={budgetPath}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.7"
            />

            {/* Predicted line */}
            <path
              d={predictedPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              opacity="0.8"
            />

            {/* Actual line */}
            <path
              d={actualPath}
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
            />

            {/* Data points */}
            {data.map((point, index) => (
              <g key={index}>
                {/* Actual point */}
                <circle
                  cx={xScale(index)}
                  cy={yScale(point.actual)}
                  r="4"
                  fill="#2563eb"
                  className="cursor-pointer hover:r-6 transition-all"
                  onMouseEnter={() => setHoveredPoint(index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                
                {/* Tooltip */}
                {hoveredPoint === index && (
                  <g>
                    <rect
                      x={xScale(index) - 60}
                      y={yScale(point.actual) - 50}
                      width="120"
                      height="40"
                      fill="white"
                      stroke="#e5e7eb"
                      rx="4"
                      className="drop-shadow-lg"
                    />
                    <text
                      x={xScale(index)}
                      y={yScale(point.actual) - 35}
                      textAnchor="middle"
                      className="text-xs font-medium fill-gray-900"
                    >
                      {formatDate(point.date)}
                    </text>
                    <text
                      x={xScale(index)}
                      y={yScale(point.actual) - 20}
                      textAnchor="middle"
                      className="text-xs fill-gray-600"
                    >
                      {formatCurrency(point.actual)}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </g>

          {/* Y-axis labels */}
          <g>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const value = minValue + (maxValue - minValue) * ratio
              const y = padding.top + innerHeight - (ratio * innerHeight)
              return (
                <g key={ratio}>
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-xs fill-gray-600"
                  >
                    {formatCurrency(value)}
                  </text>
                </g>
              )
            })}
          </g>

          {/* X-axis labels */}
          <g>
            {data.filter((_, index) => index % Math.ceil(data.length / 6) === 0).map((point, index) => {
              const originalIndex = data.findIndex(d => d.date === point.date)
              const x = padding.left + xScale(originalIndex)
              return (
                <text
                  key={point.date}
                  x={x}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {formatDate(point.date)}
                </text>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(data.reduce((sum, d) => sum + d.actual, 0) / data.length)}
          </div>
          <div className="text-sm text-gray-600">Average Daily</div>
        </div>
        
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(Math.max(...data.map(d => d.actual)))}
          </div>
          <div className="text-sm text-gray-600">Peak Day</div>
        </div>
        
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(Math.min(...data.map(d => d.actual)))}
          </div>
          <div className="text-sm text-gray-600">Lowest Day</div>
        </div>
      </div>
    </div>
  )
}