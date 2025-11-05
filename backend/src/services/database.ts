import { Pool, PoolClient } from 'pg';
import { z } from 'zod';

/**
 * Database Service for Cost Optimization Platform
 * Handles PostgreSQL connections and cost data storage
 */

export interface CostRecord {
  id: string;
  date: string;
  cost: number;
  currency: string;
  resource_group: string;
  service_name: string;
  resource_type: string;
  department: string;
  subscription_id: string;
  tags: Record<string, any>;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AnalysisResult {
  id: string;
  analysis_type: string;
  input_data: any;
  result_data: any;
  insights: string[];
  confidence: number;
  created_at: Date;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  data: any;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: Date;
  resolved_at?: Date;
}

export class DatabaseService {
  private pool: Pool;
  private isInitialized = false;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'cost_optimization',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async initialize() {
    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      // Create tables if they don't exist
      await this.createTables();
      
      this.isInitialized = true;
      console.log('✅ Database service initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Cost records table
      await client.query(`
        CREATE TABLE IF NOT EXISTS cost_records (
          id VARCHAR(255) PRIMARY KEY,
          date DATE NOT NULL,
          cost DECIMAL(12,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'USD',
          resource_group VARCHAR(255),
          service_name VARCHAR(255),
          resource_type VARCHAR(255),
          department VARCHAR(255),
          subscription_id VARCHAR(255),
          tags JSONB DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create indexes for cost records
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_cost_records_date ON cost_records(date);
        CREATE INDEX IF NOT EXISTS idx_cost_records_department ON cost_records(department);
        CREATE INDEX IF NOT EXISTS idx_cost_records_service ON cost_records(service_name);
        CREATE INDEX IF NOT EXISTS idx_cost_records_cost ON cost_records(cost);
      `);

      // Analysis results table
      await client.query(`
        CREATE TABLE IF NOT EXISTS analysis_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          analysis_type VARCHAR(100) NOT NULL,
          input_data JSONB NOT NULL,
          result_data JSONB NOT NULL,
          insights TEXT[] DEFAULT '{}',
          confidence DECIMAL(3,2) DEFAULT 0.0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Alerts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(100) NOT NULL,
          severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          data JSONB DEFAULT '{}',
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
          created_at TIMESTAMP DEFAULT NOW(),
          resolved_at TIMESTAMP
        )
      `);

      // Create indexes for alerts
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
        CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
        CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
      `);

      // Optimization recommendations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS optimization_recommendations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          monthly_savings DECIMAL(12,2),
          current_monthly_cost DECIMAL(12,2),
          effort VARCHAR(20) CHECK (effort IN ('low', 'medium', 'high')),
          risk VARCHAR(20) CHECK (risk IN ('low', 'medium', 'high')),
          actions TEXT[],
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
          department VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query('COMMIT');
      console.log('✅ Database tables created/verified');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Cost Records Operations
  async insertCostRecords(records: Partial<CostRecord>[]): Promise<void> {
    if (records.length === 0) return;

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO cost_records (
          id, date, cost, currency, resource_group, service_name, 
          resource_type, department, subscription_id, tags, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          cost = EXCLUDED.cost,
          currency = EXCLUDED.currency,
          resource_group = EXCLUDED.resource_group,
          service_name = EXCLUDED.service_name,
          resource_type = EXCLUDED.resource_type,
          department = EXCLUDED.department,
          subscription_id = EXCLUDED.subscription_id,
          tags = EXCLUDED.tags,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `;

      for (const record of records) {
        await client.query(query, [
          record.id,
          record.date,
          record.cost,
          record.currency || 'USD',
          record.resource_group,
          record.service_name,
          record.resource_type,
          record.department,
          record.subscription_id,
          JSON.stringify(record.tags || {}),
          JSON.stringify(record.metadata || {})
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCostRecords(filters: {
    startDate?: string;
    endDate?: string;
    department?: string;
    serviceType?: string;
    limit?: number;
    offset?: number;
  }): Promise<CostRecord[]> {
    let query = 'SELECT * FROM cost_records WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters.startDate) {
      paramCount++;
      query += ` AND date >= $${paramCount}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      query += ` AND date <= $${paramCount}`;
      params.push(filters.endDate);
    }

    if (filters.department) {
      paramCount++;
      query += ` AND department = $${paramCount}`;
      params.push(filters.department);
    }

    if (filters.serviceType) {
      paramCount++;
      query += ` AND service_name = $${paramCount}`;
      params.push(filters.serviceType);
    }

    query += ' ORDER BY date DESC, cost DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getCostSummary(filters: {
    startDate?: string;
    endDate?: string;
    department?: string;
  }) {
    let query = `
      SELECT 
        COUNT(*) as record_count,
        SUM(cost) as total_cost,
        AVG(cost) as avg_cost,
        MIN(cost) as min_cost,
        MAX(cost) as max_cost,
        COUNT(DISTINCT department) as department_count,
        COUNT(DISTINCT service_name) as service_count
      FROM cost_records 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;

    if (filters.startDate) {
      paramCount++;
      query += ` AND date >= $${paramCount}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      query += ` AND date <= $${paramCount}`;
      params.push(filters.endDate);
    }

    if (filters.department) {
      paramCount++;
      query += ` AND department = $${paramCount}`;
      params.push(filters.department);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0];
  }

  // Analysis Results Operations
  async saveAnalysisResult(result: Omit<AnalysisResult, 'id' | 'created_at'>): Promise<string> {
    const query = `
      INSERT INTO analysis_results (analysis_type, input_data, result_data, insights, confidence)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const dbResult = await this.pool.query(query, [
      result.analysis_type,
      JSON.stringify(result.input_data),
      JSON.stringify(result.result_data),
      result.insights,
      result.confidence
    ]);

    return dbResult.rows[0].id;
  }

  async getAnalysisResults(type?: string, limit = 50): Promise<AnalysisResult[]> {
    let query = 'SELECT * FROM analysis_results';
    const params: any[] = [];

    if (type) {
      query += ' WHERE analysis_type = $1';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Alerts Operations
  async createAlert(alert: Omit<Alert, 'id' | 'created_at'>): Promise<string> {
    const query = `
      INSERT INTO alerts (type, severity, title, description, data, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const result = await this.pool.query(query, [
      alert.type,
      alert.severity,
      alert.title,
      alert.description,
      JSON.stringify(alert.data),
      alert.status
    ]);

    return result.rows[0].id;
  }

  async getAlerts(filters: {
    status?: string;
    severity?: string;
    limit?: number;
  } = {}): Promise<Alert[]> {
    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.severity) {
      paramCount++;
      query += ` AND severity = $${paramCount}`;
      params.push(filters.severity);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async updateAlertStatus(alertId: string, status: string): Promise<void> {
    const query = `
      UPDATE alerts 
      SET status = $1, resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END
      WHERE id = $2
    `;

    await this.pool.query(query, [status, alertId]);
  }

  // Utility methods
  async executeQuery(query: string, params: any[] = []): Promise<any> {
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getConnection(): Promise<PoolClient> {
    return this.pool.connect();
  }

  isHealthy(): boolean {
    return this.isInitialized && this.pool.totalCount > 0;
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log('✅ Database connections closed');
  }
}