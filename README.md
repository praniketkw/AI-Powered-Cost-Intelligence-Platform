# AI Cost Optimization Platform

AI-powered Azure cost monitoring with real-time insights, anomaly detection, and optimization recommendations using Claude AI.

## 🚀 Quick Start

### Step 1: Prerequisites
- Node.js 18+
- Azure subscription with billing access
- [Anthropic API key](https://console.anthropic.com/) (free tier available)

### Step 2: Clone & Install
```bash
git clone <your-repo-url>
cd ai-cost-optimization-platform
npm install
```

### Step 3: Azure Setup
Create a service principal with cost management permissions:

```bash
# Login to Azure
az login

# Create service principal
az ad sp create-for-rbac --name "cost-optimization-app" \
  --role "Cost Management Reader" \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID"

# Note down: appId, password, tenant from the output
```

### Step 4: Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials:
```

```env
# Required - Get from Azure service principal creation
AZURE_SUBSCRIPTION_ID=your_subscription_id
AZURE_CLIENT_ID=your_app_id
AZURE_CLIENT_SECRET=your_password
AZURE_TENANT_ID=your_tenant_id

# Required - Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=your_claude_api_key

# Optional - For full features (uses in-memory fallback)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cost_optimization
REDIS_URL=redis://localhost:6379
```

### Step 5: Start the Platform
```bash
# Quick start (no databases required)
npm run dev:full

# Or with full setup including databases
npm run setup && npm run dev:full
```

### Step 6: Access Your Dashboard
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:8000/health

## ✨ What You'll See

- **Real-time cost data** from your Azure subscription
- **AI insights** about spending patterns and optimization opportunities  
- **Interactive chat** to ask questions like "What drove the cost spike last week?"
- **Anomaly alerts** when spending deviates from normal patterns
- **Department breakdown** showing costs by resource groups and tags

## 🔧 Architecture

```
Frontend (Next.js) → Backend API (Express) → AI Engine (Claude) → Azure Cost API
                                ↓
                    PostgreSQL + Redis (optional)
```

**Key Components:**
- **Dashboard**: Interactive cost visualization and AI chat
- **Backend**: REST API with WebSocket for real-time updates
- **AI Engine**: Claude-powered analysis and recommendations
- **MCP Server**: Azure Cost Management integration

## 📊 Features

### AI-Powered Analysis
- Natural language queries: "Show me our biggest cost drivers"
- Anomaly detection with smart alerts
- Cost forecasting and trend analysis
- Optimization recommendations

### Real-Time Monitoring
- Live cost updates via WebSocket
- Department/resource group breakdown
- Budget tracking and alerts
- Performance correlation

### Enterprise Ready
- Secure Azure integration
- Scalable microservices architecture
- Docker deployment support
- Comprehensive API

## 🛠️ Development

### Project Structure
```
├── backend/              # Express API server
├── dashboard/            # Next.js frontend
├── ai-analysis-engine/   # Claude AI integration
└── mcp-servers/         # Azure Cost MCP server
```

### Available Scripts
```bash
npm run dev:full      # Start both frontend and backend
npm run dev:backend   # Backend only
npm run dev           # Frontend only
npm run build         # Build all workspaces
npm run setup         # Automated setup with databases
```

### API Examples
```bash
# Get cost summary
GET /api/cost/summary?timeframe=30d

# Ask AI about costs
POST /api/analysis/query
{
  "query": "What caused the cost increase this week?"
}

# Get optimization recommendations
GET /api/optimization/recommendations
```

## 🐳 Docker Deployment

```bash
# Start with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t cost-optimizer .
docker run -p 3000:3000 -p 8000:8000 cost-optimizer
```

## 🔒 Security Notes

- Never commit `.env` files
- Use least-privilege Azure permissions
- Rotate service principal secrets regularly
- Enable HTTPS in production

## 📚 Documentation

- [Backend API](backend/README.md)
- [Frontend Dashboard](dashboard/README.md)
- [AI Analysis Engine](ai-analysis-engine/README.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature/name`
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Transform your cloud cost management from reactive to predictive with AI-powered intelligence.**