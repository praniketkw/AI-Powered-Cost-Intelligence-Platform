/**
 * Enterprise Profile: Large-scale SaaS Music Streaming Platform
 * Modeled after companies like Spotify, with global infrastructure
 * and complex microservices architecture
 */

export const ENTERPRISE_PROFILE = {
  company: {
    name: "StreamFlow Technologies",
    industry: "Music Streaming & Audio Platform",
    employees: 8500,
    monthlyActiveUsers: 180_000_000,
    globalRegions: 12,
    dataProcessedDaily: "2.5 PB",
    requestsPerSecond: 850_000
  },

  infrastructure: {
    totalSubscriptions: 247,
    totalResources: 52_847,
    monthlySpend: 1_250_000, // $15M annually
    regions: [
      "East US", "West US 2", "Central US",
      "North Europe", "West Europe", "UK South",
      "Southeast Asia", "East Asia", "Japan East",
      "Australia East", "Brazil South", "Canada Central"
    ]
  },

  departments: [
    {
      name: "Core Platform",
      teams: ["Audio Processing", "Streaming Infrastructure", "CDN Management"],
      monthlyBudget: 420_000,
      subscriptions: 45,
      primaryServices: ["AKS", "Azure Storage", "Azure CDN", "Azure Media Services"]
    },
    {
      name: "Data & ML",
      teams: ["Recommendation Engine", "Analytics", "Data Pipeline"],
      monthlyBudget: 280_000,
      subscriptions: 38,
      primaryServices: ["Azure ML", "Databricks", "Cosmos DB", "Event Hubs"]
    },
    {
      name: "User Experience",
      teams: ["Mobile Apps", "Web Platform", "API Gateway"],
      monthlyBudget: 180_000,
      subscriptions: 32,
      primaryServices: ["App Service", "API Management", "Application Gateway"]
    },
    {
      name: "Infrastructure",
      teams: ["DevOps", "Security", "Monitoring"],
      monthlyBudget: 220_000,
      subscriptions: 28,
      primaryServices: ["Monitor", "Key Vault", "Security Center", "Log Analytics"]
    },
    {
      name: "Content & Licensing",
      teams: ["Content Management", "Rights Management", "Metadata"],
      monthlyBudget: 95_000,
      subscriptions: 18,
      primaryServices: ["Blob Storage", "SQL Database", "Search Service"]
    },
    {
      name: "Business Intelligence",
      teams: ["Analytics", "Reporting", "Business Intelligence"],
      monthlyBudget: 55_000,
      subscriptions: 12,
      primaryServices: ["Synapse Analytics", "Power BI", "Data Factory"]
    }
  ],

  workloadPatterns: {
    peakHours: {
      // Global peak listening times
      utc: ["06:00-09:00", "17:00-22:00"],
      description: "Morning commute and evening entertainment"
    },
    seasonality: {
      high: ["December", "January", "July", "August"],
      low: ["February", "March", "September"],
      description: "Holiday seasons and summer vacation peaks"
    },
    weeklyPattern: {
      weekdays: 1.0,
      weekends: 1.3,
      description: "Higher weekend usage for music discovery"
    }
  },

  costDrivers: [
    {
      category: "Compute",
      percentage: 35,
      description: "AKS clusters, VMs for microservices"
    },
    {
      category: "Storage",
      percentage: 28,
      description: "Audio files, user data, analytics data"
    },
    {
      category: "Networking",
      percentage: 18,
      description: "CDN, data transfer, load balancers"
    },
    {
      category: "Databases",
      percentage: 12,
      description: "User data, metadata, analytics"
    },
    {
      category: "AI/ML",
      percentage: 7,
      description: "Recommendation models, audio analysis"
    }
  ]
} as const;