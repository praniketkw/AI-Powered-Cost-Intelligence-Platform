import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Generate request ID if not present
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = generateRequestId();
  }

  // Log request start
  console.log(`📥 ${req.method} ${req.url}`, {
    requestId: req.headers['x-request-id'],
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    console.log(`📤 ${req.method} ${req.url} - ${res.statusCode}`, {
      requestId: req.headers['x-request-id'],
      duration: `${duration}ms`,
      statusCode: res.statusCode,
      timestamp: new Date().toISOString()
    });

    return originalJson.call(this, body);
  };

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);

  next();
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}