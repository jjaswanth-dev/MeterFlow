import mongoose, { Schema, Document } from 'mongoose';

export interface IAPIKey extends Document {
  key: string;             // the generated API key (e.g., mf_live_abc123)
  apiId: mongoose.Types.ObjectId; // Reference to the API
  userId: string;          // The consumer who generated the key
  status: 'active' | 'revoked';
  rateLimitConfig: {
    requestsPerMinute: number;
  };
  createdAt: Date;
}

const APIKeySchema: Schema = new Schema({
  key: { type: String, required: true, unique: true },
  apiId: { type: Schema.Types.ObjectId, ref: 'API', required: true },
  userId: { type: String, required: true },
  status: { type: String, enum: ['active', 'revoked'], default: 'active' },
  rateLimitConfig: {
    requestsPerMinute: { type: Number, default: 60 },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.APIKey || mongoose.model<IAPIKey>('APIKey', APIKeySchema);
