import mongoose, { Schema, Document } from 'mongoose';

export interface IAPI extends Document {
  name: string;
  baseUrl: string;
  description: string;
  category: string;
  pricing: {
    freeQuota: number;
    pricePer100Requests: number;
  };
  upstreamAuthParam?: string; // e.g. "appid" for OpenWeather
  upstreamAuthKey?: string;   // the actual secret key for the upstream API
  ownerId: string;            // reference to User
  createdAt: Date;
}

const APISchema: Schema = new Schema({
  name: { type: String, required: true },
  baseUrl: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  pricing: {
    freeQuota: { type: Number, default: 1000 },
    pricePer100Requests: { type: Number, default: 0 },
  },
  upstreamAuthParam: { type: String },
  upstreamAuthKey: { type: String },
  ownerId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.API || mongoose.model<IAPI>('API', APISchema);
