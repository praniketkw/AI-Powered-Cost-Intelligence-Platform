'use client'

import { useState, useEffect } from 'react'

export default function TestPage() {
  const [apiStatus, setApiStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const testAPI = async () => {
      try {
        console.log('Testing API connection...')
        
        // Test health endpoint
        const healthResponse = await fetch('http://localhost:8000/health')
        const healthData = await healthResponse.json()
        console.log('Health check:', healthData)
        
        // Test full analysis
        const analysisResponse = await fetch('http://localhost:8000/api/full-analysis')
        const analysisData = await analysisResponse.json()
        console.log('Full analysis:', analysisData)
        
        setApiStatus({
          health: healthData,
          analysis: analysisData,
          success: true
        })
      } catch (error) {
        console.error('API test failed:', error)
        setApiStatus({
          error: error.message,
          success: false
        })
      } finally {
        setLoading(false)
      }
    }

    testAPI()
  }, [])

  if (loading) {
    return <div className="p-8">Testing API connection...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Connection Test</h1>
      
      {apiStatus.success ? (
        <div className="space-y-4">
          <div className="bg-green-100 p-4 rounded">
            <h2 className="font-bold text-green-800">✅ API Connection Successful!</h2>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-bold mb-2">Health Check:</h3>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(apiStatus.health, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-bold mb-2">Azure Analysis:</h3>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto max-h-96">
              {JSON.stringify(apiStatus.analysis, null, 2)}
            </pre>
          </div>
          
          <div className="bg-blue-100 p-4 rounded">
            <h3 className="font-bold text-blue-800">Data Summary:</h3>
            <ul className="text-blue-700 mt-2">
              <li>Azure Records: {apiStatus.analysis.data?.azureData?.records || 0}</li>
              <li>Total Cost: ${apiStatus.analysis.data?.azureData?.totalCost?.toFixed(2) || '0.00'}</li>
              <li>AI Confidence: {((apiStatus.analysis.data?.aiAnalysis?.confidence || 0) * 100).toFixed(0)}%</li>
              <li>Subscription: {apiStatus.analysis.data?.metadata?.subscriptionId}</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-red-100 p-4 rounded">
          <h2 className="font-bold text-red-800">❌ API Connection Failed</h2>
          <p className="text-red-700 mt-2">{apiStatus.error}</p>
        </div>
      )}
      
      <div className="mt-8">
        <a href="/" className="text-blue-600 hover:underline">← Back to Dashboard</a>
      </div>
    </div>
  )
}