import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import APIKey, { IAPIKey } from '../models/APIKey';
import API, { IAPI } from '../models/API';
import UsageLog from '../models/UsageLog';

// Extend Express Request to include our custom properties
declare global {
  namespace Express {
    interface Request {
      apiKeyData?: IAPIKey;
      apiData?: IAPI;
      gatewayStartTime?: number;
    }
  }
}

// In-memory rate limiting map since Redis is removed as per user request
// Maps API Key -> { count: number, resetTime: number }
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

/**
 * 1. Extract API Key and Lookup
 */
export const validateAPIKey = async (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-api-key'] as string;
  
  if (!key) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }

  try {
    // Lookup key in MongoDB directly (no Redis cache as requested)
    const apiKeyData = await APIKey.findOne({ key, status: 'active' }).exec();
    if (!apiKeyData) {
      return res.status(401).json({ error: 'Invalid or revoked API key' });
    }

    req.apiKeyData = apiKeyData;
    next();
  } catch (error) {
    console.error('API Key validation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * 2. Rate Limiting (In-memory)
 */
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = req.apiKeyData!.key;
  const limit = req.apiKeyData!.rateLimitConfig.requestsPerMinute;
  const now = Date.now();

  let record = rateLimitCache.get(key);
  
  // If no record or 1 minute has passed, reset
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + 60000 };
  }

  if (record.count >= limit) {
    return res.status(429).json({ error: 'Too Many Requests', retryAfter: (record.resetTime - now) / 1000 });
  }

  record.count += 1;
  rateLimitCache.set(key, record);
  
  next();
};

/**
 * 3. Resolve Target & Inject Upstream Auth
 */
export const resolveTarget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiId = req.apiKeyData!.apiId;
    const apiData = await API.findById(apiId).exec();

    if (!apiData) {
      return res.status(404).json({ error: 'Upstream API not found' });
    }

    req.apiData = apiData;

    // We can't actually forward easily if we don't dynamically set the target in http-proxy-middleware.
    // http-proxy-middleware allows custom router function to determine target.
    // We will attach apiData so the proxy middleware can use it.
    
    // Inject auth param if needed (e.g., OpenWeather appid)
    if (apiData.upstreamAuthParam && apiData.upstreamAuthKey) {
      // Modify req.url to append the query param
      const separator = req.url.includes('?') ? '&' : '?';
      req.url = `${req.url}${separator}${apiData.upstreamAuthParam}=${apiData.upstreamAuthKey}`;
    }

    next();
  } catch (error) {
    console.error('Target resolution error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * 4. Response Wrapping and Async Logging
 */
export const captureAndLog = (req: Request, res: Response, next: NextFunction) => {
  req.gatewayStartTime = Date.now();
  
  // Intercept the response finish event to log it asynchronously
  res.on('finish', () => {
    const latency = Date.now() - req.gatewayStartTime!;
    const billingMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-05"

    // Fire and forget log to MongoDB
    UsageLog.create({
      apiKeyId: req.apiKeyData!._id,
      apiId: req.apiData!._id,
      userId: req.apiKeyData!.userId,
      endpoint: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: latency,
      billingMonth
    }).catch(err => console.error('Failed to log usage:', err));
  });

  next();
};

/**
 * 5. Proxy Middleware Factory
 * This uses http-proxy-middleware to forward the request dynamically
 */
export const gatewayProxy = createProxyMiddleware({
  target: 'http://placeholder.com', // Will be overridden by router
  changeOrigin: true,
  router: (req: Request) => {
    // Dynamic target based on the resolved API
    let baseUrl = req.apiData!.baseUrl;
    // Strip trailing slash if present so path rewrite appends cleanly
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    return baseUrl;
  },
  pathRewrite: (path, req: Request) => {
    // Remove the /gateway prefix before forwarding
    return path.replace('/gateway', '');
  }
});
