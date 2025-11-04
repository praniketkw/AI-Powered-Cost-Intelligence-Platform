'use client'

import { useState } from 'react'
import { AlertTriangle, Clock, DollarSign, TrendingUp, CheckCircle, X, ExternalLink } from 'lucide-react'
import { formatCurrency, getAlertClasses } from '@/lib/mockData'

interface Alert {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  description: string
  impact: number
  timeAgo: string
  department: string
}

interface AlertsPanelProps {
  alerts: Alert[]
}

/**
 * Alerts Panel Component
 * 
 * This is like a "smart notification center" that shows:
 * 1. Cost problems that need immediate attention
 * 2. Predictions about future issues
 * 3. Optimization opportunities
 * 
 * Think of it like your phone's notification center, but for money-saving opportunities
 */

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')

  // Filter alerts based on selection and dismissed status
  const filteredAlerts = alerts.filter(alert => {
    if (dismissedAlerts.has(alert.id)) return false
    if (selectedFilter === 'all') return true
    return alert.type === selectedFilter
  })

  // Count alerts by type
  const alertCounts = {
    critical: alerts.filter(a => a.type === 'critical' && !dismissedAlerts.has(a.id)).length,
    warning: alerts.filter(a => a.type === 'warning' && !dismissedAlerts.has(a.id)).length,
    info: alerts.filter(a => a.type === 'info' && !dismissedAlerts.has(a.id)).length
  }

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-danger-600" />
      case 'warning':
        return <TrendingUp className="w-5 h-5 text-warning-600" />
      case 'info':
        return <CheckCircle className="w-5 h-5 text-primary-600" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />
    }
  }

  const getImpactColor = (impact: number) => {
    if (impact > 10000) return 'text-danger-600'
    if (impact > 5000) return 'text-warning-600'
    if (impact < 0) return 'text-success-600' // Savings
    return 'text-gray-600'
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Smart Alerts</h3>
          <p className="text-sm text-gray-600">AI-powered cost intelligence notifications</p>
        </div>
        
        {/* Alert summary */}
        <div className="flex items-center space-x-2">
          {alertCounts.critical > 0 && (
            <span className="px-2 py-1 bg-danger-100 text-danger-700 text-xs font-medium rounded-full">
              {alertCounts.critical} Critical
            </span>
          )}
          {alertCounts.warning > 0 && (
            <span className="px-2 py-1 bg-warning-100 text-warning-700 text-xs font-medium rounded-full">
              {alertCounts.warning} Warning
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'all', label: 'All', count: filteredAlerts.length },
          { key: 'critical', label: 'Critical', count: alertCounts.critical },
          { key: 'warning', label: 'Warning', count: alertCounts.warning },
          { key: 'info', label: 'Info', count: alertCounts.info }
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setSelectedFilter(filter.key as any)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedFilter === filter.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {filter.label}
            {filter.count > 0 && (
              <span className="ml-1 text-xs text-gray-500">({filter.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
            <p className="text-gray-600">No active alerts</p>
            <p className="text-sm text-gray-500">All systems are running optimally</p>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <div
              key={alert.id}
              className={`${getAlertClasses(alert.type)} animate-slide-up`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Alert icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>

                  {/* Alert content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {alert.title}
                      </h4>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {alert.timeAgo}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">
                      {alert.description}
                    </p>

                    {/* Alert metadata */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-600">
                          Department: <span className="font-medium">{alert.department}</span>
                        </span>
                        
                        {alert.impact !== 0 && (
                          <span className={`font-medium ${getImpactColor(alert.impact)}`}>
                            {alert.impact > 0 ? 'Cost: ' : 'Savings: '}
                            {formatCurrency(Math.abs(alert.impact))}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2">
                        <button className="text-primary-600 hover:text-primary-700 font-medium">
                          View Details
                        </button>
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick actions footer */}
      {filteredAlerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filteredAlerts.length} active alerts
            </div>
            
            <div className="flex space-x-2">
              <button className="btn btn-secondary text-xs">
                Mark All Read
              </button>
              <button className="btn btn-primary text-xs">
                View All Alerts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}