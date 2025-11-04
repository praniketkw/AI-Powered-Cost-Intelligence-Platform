'use client'

import { useState } from 'react'
import { Bell, Search, Settings, User, TrendingUp, AlertTriangle } from 'lucide-react'

interface DashboardHeaderProps {
  selectedTimeframe: string
  onTimeframeChange: (timeframe: string) => void
}

/**
 * Dashboard Header Component
 * 
 * This is the top navigation bar that shows:
 * 1. Company/platform branding
 * 2. Time period selector (7 days, 30 days, etc.)
 * 3. Quick actions (notifications, search, settings)
 * 4. Key status indicators
 */

export function DashboardHeader({ selectedTimeframe, onTimeframeChange }: DashboardHeaderProps) {
  const [notificationCount] = useState(7) // Number of active alerts

  const timeframes = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ]

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cost Intelligence</h1>
                <p className="text-xs text-gray-500">StreamFlow Technologies</p>
              </div>
            </div>

            {/* Status indicator */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-success-50 rounded-full">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-success-700 font-medium">Live Monitoring</span>
            </div>
          </div>

          {/* Center - Time period selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="timeframe" className="text-sm font-medium text-gray-700">
              Time Period:
            </label>
            <select
              id="timeframe"
              value={selectedTimeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {timeframes.map((tf) => (
                <option key={tf.value} value={tf.value}>
                  {tf.label}
                </option>
              ))}
            </select>
          </div>

          {/* Right side - Actions and user menu */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications with badge */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Settings className="w-5 h-5" />
            </button>

            {/* User menu */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">John Doe</p>
                <p className="text-xs text-gray-500">Cost Analyst</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick status bar */}
      <div className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span className="text-gray-600">All systems operational</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-warning-500" />
                <span className="text-gray-600">2 budget alerts active</span>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}