import API from '../models/API';
import UsageLog from '../models/UsageLog';
import Billing from '../models/Billing';

/**
 * Calculates billing for all users for a given month.
 * This can be run via BullMQ, node-cron, or manually triggered.
 */
export const calculateBilling = async (billingMonth: string) => {
  console.log(`Starting billing calculation for month: ${billingMonth}`);

  // 1. Aggregate usage logs by userId and apiId
  const usageAggregation = await UsageLog.aggregate([
    { $match: { billingMonth } },
    { 
      $group: {
        _id: { userId: '$userId', apiId: '$apiId' },
        totalRequests: { $sum: 1 }
      }
    }
  ]);

  for (const record of usageAggregation) {
    const { userId, apiId } = record._id;
    const totalRequests = record.totalRequests;

    // 2. Fetch API pricing details
    const api = await API.findById(apiId);
    if (!api) continue;

    const { freeQuota, pricePer100Requests } = api.pricing;

    // 3. Calculate billable requests
    const billableRequests = Math.max(0, totalRequests - freeQuota);
    
    // 4. Calculate amount due (e.g. in cents/paise)
    const amountDue = (billableRequests / 100) * pricePer100Requests;

    // 5. Upsert billing record (Idempotent)
    await Billing.findOneAndUpdate(
      { userId, apiId, billingMonth },
      {
        totalRequests,
        billableRequests,
        amountDue,
        status: 'pending' // Keeps it pending until paid
      },
      { upsert: true, new: true }
    );

    console.log(`Billed User ${userId} for API ${api.name}: ${amountDue} due.`);
  }

  console.log('Billing calculation completed.');
};
