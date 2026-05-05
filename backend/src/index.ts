import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { connectDB } from './config/db';
import { auth } from './config/auth';
import { toNodeHandler } from 'better-auth/node';
import { validateAPIKey, rateLimiter, resolveTarget, captureAndLog, gatewayProxy } from './middleware/gateway';
import apiRoutes from './routes/apiRoutes';
import { calculateBilling } from './workers/billingWorker';

const app = express();
const PORT = process.env.PORT || 4000;

// Enable trust proxy for secure cookies in deployment
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Middlewares
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));

// BetterAuth endpoints (Must come before body parser if it consumes raw requests, but BetterAuth handles it)
app.use('/api/auth', toNodeHandler(auth));

// Gateway Routes (Must come BEFORE express.json() because http-proxy-middleware needs raw body stream)
app.use(
  '/gateway',
  validateAPIKey,
  rateLimiter,
  resolveTarget,
  captureAndLog,
  gatewayProxy
);

// Standard API Routes (Uses JSON body parser)
app.use(express.json());
app.use('/api', apiRoutes);

// Endpoint to trigger billing manually for testing
app.post('/api/billing/calculate', async (req, res) => {
  const { month } = req.body; // e.g. "2026-05"
  if (!month) return res.status(400).json({ error: 'month is required' });

  try {
    await calculateBilling(month);
    res.json({ message: 'Billing calculation complete' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate billing' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.send('MeterFlow Backend is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
