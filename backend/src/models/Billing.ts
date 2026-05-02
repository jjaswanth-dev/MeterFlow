import mongoose, { Schema, Document } from 'mongoose';

export interface IBilling extends Document {
  userId: string;
  apiId: mongoose.Types.ObjectId;
  billingMonth: string; // e.g. "2026-05"
  totalRequests: number;
  billableRequests: number;
  amountDue: number; // in smallest currency unit (e.g. paise)
  status: 'pending' | 'paid';
  createdAt: Date;
}

const BillingSchema: Schema = new Schema({
  userId: { type: String, required: true },
  apiId: { type: Schema.Types.ObjectId, ref: 'API', required: true },
  billingMonth: { type: String, required: true },
  totalRequests: { type: Number, required: true, default: 0 },
  billableRequests: { type: Number, required: true, default: 0 },
  amountDue: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

BillingSchema.index({ userId: 1, billingMonth: 1 });

export default mongoose.models.Billing || mongoose.model<IBilling>('Billing', BillingSchema);
