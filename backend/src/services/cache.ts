import { createClient, RedisClientType } from 'redis';

/**
 * Cache Service using Redis for high-performance data caching
 * Optimizes API response times and reduces database load
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class CacheService {
  private client: RedisClientType;
  private isInitialized = false;
  private readonly defaultTTL = 3600; // 1 hour
  private readonly keyPrefix = 'cost-opt:';

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
      },
    });

    this.client.on('error', (error) => {
      console.error('Redis client error:', error);
    });

    this.client.on('connect', () => {
      console.log('✅ Redis client connected');
    });

    this.client.on('disconnect', () => {
      console.log('🔌 Redis client disconnected');
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.client.connect();
      await this.client.ping();
      this.isInitialized = true;
      console.log('✅ Cache service initialized');
    } catch (error) {
      console.error('❌ Cache service initialization failed:', error);
      // Continue without cache if Redis is not available
      console.log('⚠️ Running without cache service');
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  // Basic cache operations
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.isInitialized) return null;

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const value = await this.client.get(fullKey);
      
      if (value === null) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isInitialized) return false;

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const ttl = options.ttl || this.defaultTTL;
      
      await this.client.setEx(fullKey, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isInitialized) return false;

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.client.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isInitialized) return false;

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.client.exists(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Advanced cache operations
  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    if (!this.isInitialized) return keys.map(() => null);

    try {
      const fullKeys = keys.map(key => this.buildKey(key, options.prefix));
      const values = await this.client.mGet(fullKeys);
      
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: Array<[string, any]>, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isInitialized) return false;

    try {
      const ttl = options.ttl || this.defaultTTL;
      const pipeline = this.client.multi();

      for (const [key, value] of keyValuePairs) {
        const fullKey = this.buildKey(key, options.prefix);
        pipeline.setEx(fullKey, ttl, JSON.stringify(value));
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  // Cost-specific cache methods
  async getCostData(cacheKey: string): Promise<any | null> {
    return this.get(cacheKey, { prefix: 'cost-data:', ttl: 1800 }); // 30 minutes
  }

  async setCostData(cacheKey: string, data: any): Promise<boolean> {
    return this.set(cacheKey, data, { prefix: 'cost-data:', ttl: 1800 });
  }

  async getAnalysisResult(analysisId: string): Promise<any | null> {
    return this.get(analysisId, { prefix: 'analysis:', ttl: 7200 }); // 2 hours
  }

  async setAnalysisResult(analysisId: string, result: any): Promise<boolean> {
    return this.set(analysisId, result, { prefix: 'analysis:', ttl: 7200 });
  }

  async getDashboardData(dashboardKey: string): Promise<any | null> {
    return this.get(dashboardKey, { prefix: 'dashboard:', ttl: 600 }); // 10 minutes
  }

  async setDashboardData(dashboardKey: string, data: any): Promise<boolean> {
    return this.set(dashboardKey, data, { prefix: 'dashboard:', ttl: 600 });
  }

  // Pattern-based operations
  async getKeys(pattern: string): Promise<string[]> {
    if (!this.isInitialized) return [];

    try {
      const fullPattern = this.buildKey(pattern);
      return await this.client.keys(fullPattern);
    } catch (error) {
      console.error('Cache getKeys error:', error);
      return [];
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.isInitialized) return 0;

    try {
      const keys = await this.getKeys(pattern);
      if (keys.length === 0) return 0;

      const result = await this.client.del(keys);
      return result;
    } catch (error) {
      console.error('Cache deletePattern error:', error);
      return 0;
    }
  }

  // Cache warming and invalidation
  async warmCache(warmingFunction: () => Promise<void>): Promise<void> {
    try {
      console.log('🔥 Warming cache...');
      await warmingFunction();
      console.log('✅ Cache warming completed');
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.deletePattern(`*:${tag}:*`);
    }
  }

  // Statistics and monitoring
  async getStats(): Promise<any> {
    if (!this.isInitialized) {
      return {
        connected: false,
        memory: 0,
        keys: 0,
        hits: 0,
        misses: 0
      };
    }

    try {
      const info = await this.client.info('memory');
      const keyCount = await this.client.dbSize();
      
      return {
        connected: true,
        memory: this.parseMemoryInfo(info),
        keys: keyCount,
        // Note: Redis doesn't provide hit/miss stats by default
        // You'd need to implement custom tracking for this
        hits: 0,
        misses: 0
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        connected: false,
        memory: 0,
        keys: 0,
        hits: 0,
        misses: 0
      };
    }
  }

  private parseMemoryInfo(info: string): number {
    const match = info.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Cache-aside pattern helper
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch the data
    const data = await fetchFunction();
    
    // Store in cache for next time
    await this.set(key, data, options);
    
    return data;
  }

  // Cleanup operations
  async cleanup(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      console.log('🧹 Starting cache cleanup...');
      
      // Remove expired keys (Redis handles this automatically, but we can force it)
      const expiredKeys = await this.getKeys('*:expired:*');
      if (expiredKeys.length > 0) {
        await this.client.del(expiredKeys);
        console.log(`🗑️ Removed ${expiredKeys.length} expired keys`);
      }

      // Clean up old analysis results (older than 24 hours)
      const oldAnalysisPattern = 'analysis:*';
      const analysisKeys = await this.getKeys(oldAnalysisPattern);
      let removedCount = 0;

      for (const key of analysisKeys) {
        const ttl = await this.client.ttl(key);
        if (ttl < 0) { // Key exists but has no expiration
          await this.client.expire(key, 86400); // Set 24 hour expiration
          removedCount++;
        }
      }

      console.log(`✅ Cache cleanup completed. Processed ${removedCount} analysis keys`);
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
    }
  }

  // Health check
  isHealthy(): boolean {
    return this.isInitialized;
  }

  async close(): Promise<void> {
    if (this.isInitialized) {
      await this.client.quit();
      console.log('✅ Cache service closed');
    }
  }
}