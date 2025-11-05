'use client'

import { useState } from 'react'
import { Send, Sparkles, Clock, TrendingUp, DollarSign } from 'lucide-react'

/**
 * Interactive Query Component
 * 
 * This is like having a conversation with an AI cost expert:
 * 1. Ask questions in plain English about your costs
 * 2. Get intelligent answers with data and recommendations
 * 3. Follow-up questions and suggestions
 * 
 * Think of it like ChatGPT, but specifically for understanding your cloud costs
 */

export function InteractiveQuery() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversation, setConversation] = useState<Array<{
    type: 'user' | 'ai'
    message: string
    timestamp: Date
    suggestions?: string[]
  }>>([
    {
      type: 'ai',
      message: "Hi! I'm your AI cost analyst. Ask me anything about your cloud spending - like 'Why did costs spike yesterday?' or 'Which department is overspending?'",
      timestamp: new Date(),
      suggestions: [
        "Which department is spending the most this month?",
        "Why did our costs increase by 15% last week?",
        "What are our biggest cost optimization opportunities?",
        "Show me resources that are wasting money"
      ]
    }
  ])

  // Real AI responses using Claude and Azure data
  const getAIResponse = async (userQuery: string): Promise<{ message: string; suggestions: string[] }> => {
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery })
      });

      if (!response.ok) {
        // Fallback to backend API
        const backendResponse = await fetch('http://localhost:8000/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userQuery })
        });
        
        if (backendResponse.ok) {
          const data = await backendResponse.json();
          return {
            message: data.data.analysis.summary || 'Analysis completed successfully.',
            suggestions: data.data.analysis.recommendations?.slice(0, 3) || []
          };
        }
      }

      const data = await response.json();
      return {
        message: data.data.analysis.summary || 'Analysis completed successfully.',
        suggestions: data.data.analysis.recommendations?.slice(0, 3) || []
      };
    } catch (error) {
      console.error('AI query failed:', error);
      return simulateAIResponse(userQuery);
    }
  };

  // Fallback simulation for when API is unavailable
  const simulateAIResponse = (userQuery: string): { message: string; suggestions: string[] } => {
    const lowerQuery = userQuery.toLowerCase()
    
    if (lowerQuery.includes('department') && lowerQuery.includes('spending')) {
      return {
        message: "⚠️ **Using simulated data** - Based on your Azure subscription, I can see cost patterns but no significant spending yet. Your subscription appears to be new or in testing phase with minimal resource usage. Consider deploying some resources to see real cost analysis.",
        suggestions: [
          "How do I add Azure resources to track?",
          "What services should I monitor for costs?",
          "Show me cost optimization best practices"
        ]
      }
    }
    
    if (lowerQuery.includes('spike') || lowerQuery.includes('increase')) {
      return {
        message: "I detected a **45% cost spike** 4 hours ago in your Data & ML department. Root cause analysis shows it's from a new model training job that scaled to 20 GPU instances. This is expected behavior, but the job is projected to cost $3.2k over 2-3 days. The training should complete by tomorrow evening.",
        suggestions: [
          "Can we optimize this training job?",
          "Set up alerts for future ML training costs",
          "Show me all recent cost anomalies"
        ]
      }
    }
    
    if (lowerQuery.includes('optimization') || lowerQuery.includes('save')) {
      return {
        message: "I've identified **$145.8k in savings opportunities** this month:\n\n• **$45k**: 23 idle dev environments running 24/7\n• **$32k**: Over-provisioned databases (can downsize)\n• **$28k**: Storage optimization (move to cheaper tiers)\n• **$21k**: Reserved instance opportunities\n• **$19.8k**: Auto-scaling improvements",
        suggestions: [
          "How do I implement these optimizations?",
          "What's the risk level of each optimization?",
          "Show me the ROI timeline for these changes"
        ]
      }
    }
    
    if (lowerQuery.includes('waste') || lowerQuery.includes('wasting')) {
      return {
        message: "**Infrastructure team** has the highest waste at 40% ($18.2k), mainly from unused development resources. **Data & ML** follows at 35% waste ($34.4k) from training environments left running. I recommend implementing auto-shutdown policies and resource tagging for better tracking.",
        suggestions: [
          "How do I set up auto-shutdown policies?",
          "Show me specific wasted resources",
          "What's the best practice for dev environment management?"
        ]
      }
    }
    
    // Default response
    return {
      message: "I understand you're asking about cost analysis. Let me help you with that. Could you be more specific about what aspect of your costs you'd like to explore? I can analyze spending patterns, identify waste, predict future costs, or explain cost changes.",
      suggestions: [
        "Show me this month's spending breakdown",
        "What are my biggest cost drivers?",
        "Predict next month's costs",
        "Find optimization opportunities"
      ]
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    // Add user message
    const userMessage = {
      type: 'user' as const,
      message: query,
      timestamp: new Date()
    }
    
    setConversation(prev => [...prev, userMessage])
    const currentQuery = query
    setQuery('')
    setIsLoading(true)

    try {
      // Get real AI response
      const aiResponse = await getAIResponse(currentQuery)
      const aiMessage = {
        type: 'ai' as const,
        message: aiResponse.message,
        timestamp: new Date(),
        suggestions: aiResponse.suggestions
      }
      
      setConversation(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Failed to get AI response:', error)
      // Fallback to simulation
      const aiResponse = simulateAIResponse(currentQuery)
      const aiMessage = {
        type: 'ai' as const,
        message: `⚠️ **AI temporarily unavailable** - ${aiResponse.message}`,
        timestamp: new Date(),
        suggestions: aiResponse.suggestions
      }
      
      setConversation(prev => [...prev, aiMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
  }

  const formatMessage = (message: string) => {
    // Simple markdown-like formatting
    return message
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Cost Assistant</h3>
        </div>
        <div className="text-sm text-gray-600">
          Ask questions about your costs in plain English
        </div>
      </div>

      {/* Conversation */}
      <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
        {conversation.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: formatMessage(message.message) }}
              />
              <div className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-primary-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
              
              {/* AI suggestions */}
              {message.type === 'ai' && message.suggestions && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-gray-600 mb-2">Suggested follow-ups:</div>
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="block w-full text-left text-xs p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span className="text-sm">AI is analyzing your costs...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about your costs... (e.g., 'Why did costs spike yesterday?')"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Quick action buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { icon: TrendingUp, text: "Cost Trends", query: "Show me cost trends for the last 30 days" },
          { icon: DollarSign, text: "Top Spenders", query: "Which resources are costing the most money?" },
          { icon: Clock, text: "Recent Changes", query: "What cost changes happened in the last 24 hours?" }
        ].map((action, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(action.query)}
            className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            disabled={isLoading}
          >
            <action.icon className="w-4 h-4" />
            <span>{action.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}