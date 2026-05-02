import { Router } from 'express';
import API from '../models/API';
import APIKey from '../models/APIKey';
import UsageLog from '../models/UsageLog';
import Billing from '../models/Billing';

const router = Router();

// --- APIs CRUD ---

// Get all APIs
router.get('/apis', async (req, res) => {
  const apis = await API.find();
  res.json(apis);
});

// Create a new API (Admin only normally, but simplified for now)
router.post('/apis', async (req, res) => {
  try {
    const api = await API.create(req.body);
    res.status(201).json(api);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create API' });
  }
});

// Delete an API
router.delete('/apis/:id', async (req, res) => {
  try {
    await API.findByIdAndDelete(req.params.id);
    // Optionally delete associated keys
    await APIKey.deleteMany({ apiId: req.params.id });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete API' });
  }
});


// --- API Keys CRUD ---

// Get API Keys for current user (userId would come from session, simulating with query param for now if no auth middleware)
router.get('/keys', async (req, res) => {
  const { userId } = req.query; // in real app, req.user.id
  if (!userId) return res.status(400).json({ error: 'userId required' });
  
  const keys = await APIKey.find({ userId }).populate('apiId');
  res.json(keys);
});

// Generate a new API Key
router.post('/keys', async (req, res) => {
  const { apiId, userId } = req.body;
  
  try {
    const keyString = `mf_live_${Math.random().toString(36).substring(2, 15)}`;
    const newKey = await APIKey.create({
      key: keyString,
      apiId,
      userId
    });
    res.status(201).json(newKey);
  } catch (error) {
    res.status(400).json({ error: 'Failed to generate key' });
  }
});

// Delete an API Key
router.delete('/keys/:id', async (req, res) => {
  try {
    await APIKey.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete key' });
  }
});


// --- Analytics & Billing ---

// Get usage logs for a user
router.get('/analytics/usage', async (req, res) => {
  const { userId } = req.query;
  const logs = await UsageLog.find({ userId }).sort({ timestamp: -1 }).limit(100);
  res.json(logs);
});

// Get billing for a user
router.get('/billing', async (req, res) => {
  const { userId } = req.query;
  const bills = await Billing.find({ userId }).populate('apiId');
  res.json(bills);
});

export default router;
