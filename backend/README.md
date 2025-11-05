# AI Cost Optimization Platform - Backend

The main backend API server that orchestrates all services including AI analysis, MCP integration, real-time data processing, and WebSocket communications.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Server                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Express   │  │  WebSocket  │  │   Cron      │        │
│  │   Routes    │  │   Server    │  │   Jobs      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ AI Analysis │  │ Data Pipeline│  │ Realtime    │        │
│  │ Service     │  │ Service     │  │ Service     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Database    │  │ Cache       │  │ MCP         │        │
│  │ Service     │  │ Service     │  │ Integration │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 🚀 Core Services
- **AI Analysis Service**: Claude-powered cost analysis and insights
- **Data Pipeline Service**: Automated data synchronization and processing
- **Realtime Service**: WebSocket-based live updates and notifications
- **MCP Integration**: Communication with Model Context Protocol servers
- **Database Service**: PostgreSQL integration for data persistence
- **Cache Service**: Redis-based intelligent caching

### 📊 API Endpoints
- **Cost Data API** (`/api/cost/*`): Cost data retrieval and management
- **Analysis API** (`/api/analysis/*`): AI-powered analysis and insights
- **Optimization API** (`/api/optimization/*`): Cost optimization recommendations
- **Alerts API** (`/api/alerts/*`): Alert management and notifications
- **Dashboard API** (`/api/dashboard/*`): Dashboard data aggregation

### ⚡ Real-time Features
- WebSocket connections for live updates
- Real-time cost monitoring
- Instant anomaly notifications
- Live job progress tracking
- Interactive query processing

### 🔄 Automated Processes
- Hourly cost data synchronization
- AI insights generation every 4 hours
- Anomaly detection every 2 hours
- Daily cache cleanup
- Automated alert generation

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Anthropic API key

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp ../.env.example ../.env
   # Edit .env with your configuration
   ```

3. **Start PostgreSQL and Redis**:
   ```bash
   # Using Docker
   docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:13
   docker run -d --name redis -p 6379:6379 redis:6-alpine
   ```

4. **Start the backend server**:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:8000` with WebSocket support.

## Environment Configuration

### Required Variables
```env
# Backend Server
PORT=8000
NODE_ENV=development
ANTHROPIC_API_KEY=your_key_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cost_optimization
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379
```

### Optional Variables
```env
# Azure Integration (for real data)
AZURE_SUBSCRIPTION_ID=your_subscription_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=your_tenant_id

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Performance
RATE_LIMIT_MAX_REQUESTS=1000
WS_MAX_CONNECTIONS=1000
```

## API Documentation

### Health Check
```bash
GET /health
```
Returns server health status and service availability.

### Cost Data
```bash
# Get cost data with filters
GET /api/cost/data?startDate=2024-01-01&endDate=2024-01-31&department=engineering

# Get cost summary
GET /api/cost/summary?timeframe=30d

# Trigger data sync
POST /api/cost/sync
```

### AI Analysis
```bash
# Interactive query
POST /api/analysis/query
{
  "query": "What are the top cost drivers this month?",
  "department": "engineering"
}

# Detect anomalies
POST /api/analysis/anomalies
{
  "days": 30,
  "threshold": 2.0
}

# Generate forecast
POST /api/analysis/forecast
{
  "forecastPeriod": "3 months",
  "department": "engineering"
}
```

### Optimization
```bash
# Get recommendations
POST /api/optimization/recommendations
{
  "department": "engineering",
  "minSavings": 100,
  "riskTolerance": "medium"
}

# Rightsizing analysis
POST /api/optimization/rightsizing
{
  "utilizationThreshold": 20
}
```

### WebSocket Events

Connect to `ws://localhost:8000` and subscribe to events:

```javascript
const ws = new WebSocket('ws://localhost:8000');

// Subscribe to cost updates
ws.send(JSON.stringify({
  type: 'subscribe',
  data: { type: 'cost_updates' }
}));

// Listen for events
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

Available subscriptions:
- `cost_updates`: Real-time cost data changes
- `anomaly_alerts`: Anomaly detection alerts
- `insights`: AI-generated insights
- `job_progress`: Background job progress
- `recommendations`: New optimization recommendations

## Development

### Project Structure
```
backend/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── services/             # Core services
│   │   ├── database.ts       # PostgreSQL integration
│   │   ├── cache.ts          # Redis caching
│   │   ├── ai-analysis.ts    # AI analysis wrapper
│   │   ├── mcp-integration.ts # MCP server communication
│   │   ├── data-pipeline.ts  # Data processing pipeline
│   │   └── realtime.ts       # WebSocket management
│   ├── routes/               # API route handlers
│   │   ├── cost.ts           # Cost data endpoints
│   │   ├── analysis.ts       # AI analysis endpoints
│   │   ├── optimization.ts   # Optimization endpoints
│   │   ├── alerts.ts         # Alert management
│   │   └── dashboard.ts      # Dashboard data
│   └── middleware/           # Express middleware
│       ├── validation.ts     # Request validation
│       ├── error-handler.ts  # Error handling
│       └── request-logger.ts # Request logging
├── package.json
├── tsconfig.json
└── README.md
```

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Database Migrations
The database service automatically creates tables on startup. For production, consider using a proper migration system.

### Monitoring
- Health endpoint: `GET /health`
- Service statistics available through individual service methods
- WebSocket connection monitoring
- Job queue monitoring

## Integration with Other Services

### AI Analysis Engine
The backend integrates with the AI Analysis Engine workspace:
```typescript
import { AIAnalysisEngine } from '../../../ai-analysis-engine/src/core/analysis-engine.js';
```

### MCP Servers
Communicates with MCP servers for cost data:
```typescript
// Azure Cost MCP Server
const costData = await mcpIntegrationService.getCostData({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

### Frontend Dashboard
Provides API endpoints consumed by the Next.js dashboard:
- REST API for data retrieval
- WebSocket for real-time updates
- CORS configured for frontend origin

## Production Deployment

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 8000
CMD ["node", "dist/index.js"]
```

### Environment Setup
- Use environment-specific `.env` files
- Configure proper database connection pooling
- Set up Redis clustering for high availability
- Configure rate limiting and security headers
- Set up proper logging and monitoring

### Scaling Considerations
- Horizontal scaling with load balancer
- Database read replicas for heavy read workloads
- Redis clustering for cache distribution
- WebSocket sticky sessions for load balancing
- Background job queue with Redis Bull

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify connection credentials
   - Ensure database exists

2. **Redis Connection Failed**
   - Check Redis is running
   - Verify Redis URL format
   - Check network connectivity

3. **MCP Server Communication Failed**
   - Verify MCP servers are running
   - Check MCP server logs
   - Validate MCP protocol messages

4. **WebSocket Connection Issues**
   - Check firewall settings
   - Verify WebSocket upgrade headers
   - Monitor connection limits

### Debugging
- Set `LOG_LEVEL=debug` for detailed logging
- Use `NODE_ENV=development` for stack traces
- Monitor service health endpoints
- Check individual service statistics

## Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Include request validation
4. Write comprehensive tests
5. Update API documentation
6. Follow the existing code structure

## License

MIT License - see LICENSE file for details.