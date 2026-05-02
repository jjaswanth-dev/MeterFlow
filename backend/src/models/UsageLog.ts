import mongoose, { Schema, Document } from 'mongoose';

export interface IUsageLog extends Document {
  apiKeyId: mongoose.Types.ObjectId; // Reference to APIKey
  apiId: mongoose.Types.ObjectId;    // Reference to API
  userId: string;                    // The consumer
  endpoint: string;                  // The path accessed
  statusCode: number;
  latencyMs: number;
  billingMonth: string;              // e.g., "2026-05" for grouping
  timestamp: Date;
}

const UsageLogSchema: Schema = new Schema({
  apiKeyId: { type: Schema.Types.ObjectId, ref: 'APIKey', required: true },
  apiId: { type: Schema.Types.ObjectId, ref: 'API', required: true },
  userId: { type: String, required: true },
  endpoint: { type: String, required: true },
  statusCode: { type: Number, required: true },
  latencyMs: { type: Number, required: true },
  billingMonth: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Indexes for fast querying
UsageLogSchema.index({ apiKeyId: 1, timestamp: -1 });
UsageLogSchema.index({ userId: 1, billingMonth: 1 });
// TTL index to automatically delete logs older than 90 days
UsageLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.models.UsageLog || mongoose.model<IUsageLog>('UsageLog', UsageLogSchema);
