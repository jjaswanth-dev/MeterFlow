# 🚀 MetricFlow — Usage-Based API Gateway & Billing Platform

MetricFlow is a full-stack SaaS platform that acts as a **smart API Gateway**. It lets you register any third-party API (like the Pokémon API), proxy requests through it, track per-user usage, enforce rate limits, and automatically calculate billing — all from a clean dashboard.

---

## 📖 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Setup](#4-environment-setup)
5. [Running the Application](#5-running-the-application)
6. [Step-by-Step: Full Workflow (Register → Key → Gateway)](#6-step-by-step-full-workflow)
7. [API Reference — All Endpoints](#7-api-reference)
8. [Testing with Postman — Complete Guide](#8-testing-with-postman)
9. [Pokémon API — Real Example Walkthrough](#9-pokémon-api-real-example)
10. [Billing System Explained](#10-billing-system-explained)
11. [Dashboard & Charts](#11-dashboard--charts)
12. [Data Models](#12-data-models)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER / CLIENT                         │
│              (Browser Dashboard or Postman)                   │
└────────────────────────────┬────────────────────────────────┘
                             │
               ┌─────────────▼──────────────┐
               │      Next.js Frontend       │
               │      localhost:3000          │
               │  - Auth (Login / Register)   │
               │  - Dashboard                 │
               │  - API & Key Management      │
               │  - Usage Charts & Billing    │
               └─────────────┬──────────────┘
                             │ REST API calls
               ┌─────────────▼──────────────┐
               │    Express.js Backend        │
               │      localhost:4000          │
               │                              │
               │  /api/auth/*  → BetterAuth   │
               │  /api/*       → CRUD routes  │
               │  /gateway/*   → Proxy engine │
               └──────┬─────────────┬────────┘
                      │             │
              ┌───────▼───┐  ┌──────▼──────────────────────┐
              │  MongoDB   │  │   Upstream API (e.g. PokeAPI)│
              │  (Atlas)   │  │   https://pokeapi.co/api/v2  │
              └───────────┘  └──────────────────────────────┘
```

**How a gateway request flows:**
1. Client sends `GET /gateway/pokemon/ditto` with `x-api-key: mf_live_...`
2. `validateAPIKey` looks up the key in MongoDB, confirms it is **active**
3. `rateLimiter` checks in-memory counter — blocks if over 60 req/min
4. `resolveTarget` loads the linked API record and its `baseUrl`
5. `captureAndLog` hooks on `res.finish` to write a `UsageLog` document
6. `gatewayProxy` forwards the request to `https://pokeapi.co/api/v2/pokemon/ditto`
7. The upstream response is streamed back to the client transparently

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Axios |
| Backend | Express.js 5, TypeScript, tsx |
| Auth | [BetterAuth](https://better-auth.com) (email/password) |
| Database | MongoDB via Mongoose |
| Proxy | http-proxy-middleware |
| Billing | Custom billing worker (calculateBilling) |
| Charts | Recharts (bar charts on dashboard) |

---

## 3. Project Structure

```
MetricFlow/
├── backend/
│   └── src/
│       ├── index.ts              # Express app entry point
│       ├── config/
│       │   ├── db.ts             # MongoDB connection
│       │   └── auth.ts           # BetterAuth setup
│       ├── middleware/
│       │   └── gateway.ts        # validateAPIKey, rateLimiter, resolveTarget, captureAndLog, gatewayProxy
│       ├── models/
│       │   ├── API.ts            # Registered API schema
│       │   ├── APIKey.ts         # Generated key schema
│       │   ├── UsageLog.ts       # Per-request log schema
│       │   └── Billing.ts        # Monthly billing schema
│       ├── routes/
│       │   └── apiRoutes.ts      # CRUD routes for APIs, Keys, Analytics, Billing
│       └── workers/
│           └── billingWorker.ts  # calculateBilling() aggregation function
└── frontend/
    └── src/app/
        ├── auth/page.tsx         # Login / Register page
        ├── (dashboard)/
        │   ├── apis/page.tsx     # Register & manage APIs
        │   ├── keys/page.tsx     # Generate & manage API keys
        │   ├── analytics/        # Usage charts
        │   └── billing/          # Billing records
        └── layout.tsx            # Root layout with sidebar
```

---

## 4. Environment Setup

### Backend `.env` (`backend/.env`)

```env
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/metricflow
BETTER_AUTH_SECRET=your_super_secret_key_here
BETTER_AUTH_URL=http://localhost:4000
```

### Frontend `.env.local` (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
BETTER_AUTH_URL=http://localhost:4000
```

---

## 5. Running the Application

### Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Start the backend (port 4000)

```bash
cd backend
npm run dev
```

You should see:
```
Server is running on port 4000
MongoDB Connected: cluster.mongodb.net
```

### Start the frontend (port 3000)

```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 6. Step-by-Step: Full Workflow

> This is the **mandatory sequence** before you can make any gateway request.

### Step 1 — Register an Account

1. Go to **http://localhost:3000/auth**
2. Click **"create an account"**
3. Fill in: **Full Name**, **Email**, **Password**
4. Click **Sign Up** → you are redirected to the dashboard

> BetterAuth creates a user record in MongoDB and sets a session cookie automatically.

---

### Step 2 — Register an API (e.g. Pokémon API)

1. In the dashboard sidebar, click **"APIs"**
2. Click the **"Add New API"** button (top right)
3. Fill in the form:

| Field | Example Value |
|---|---|
| API Name | `Pokémon API` |
| Base URL | `https://pokeapi.co/api/v2` |
| Description | `Free Pokémon data API` |
| Category | `Gaming` |

4. Click **Save API**

MetricFlow calls:
```
POST http://localhost:4000/api/apis
Body: { "name": "Pokémon API", "baseUrl": "https://pokeapi.co/api/v2", ... }
```

The API gets a MongoDB `_id` (e.g. `6638a1f2b3c4d5e6f7a8b9c0`). This is your **API ID**.

> ⚠️ **You must register an API BEFORE generating a key.** The key is always linked to a specific API.

---

### Step 3 — Generate an API Key

1. In the dashboard sidebar, click **"API Keys"**
2. Click **"Generate New Key"**
3. MetricFlow automatically picks the first registered API and creates a key for your user

The backend generates a key in the format:
```
mf_live_abc123xyz456789
```

Copy this key — you will use it as the `x-api-key` header in all gateway requests.

The key is stored in MongoDB:
```json
{
  "key": "mf_live_abc123xyz456789",
  "apiId": "6638a1f2b3c4d5e6f7a8b9c0",
  "userId": "user_abc123",
  "status": "active",
  "rateLimitConfig": { "requestsPerMinute": 60 }
}
```

---

### Step 4 — Make a Gateway Request

Now you can proxy any request through MetricFlow's gateway:

```
GET http://localhost:4000/gateway/pokemon/pikachu
Headers:
  x-api-key: mf_live_abc123xyz456789
```

MetricFlow:
- Validates your key ✅
- Checks rate limit ✅
- Looks up the API's `baseUrl` = `https://pokeapi.co/api/v2`
- Rewrites path: `/gateway/pokemon/pikachu` → `/pokemon/pikachu`
- Forwards to: `https://pokeapi.co/api/v2/pokemon/pikachu`
- Logs the request to `UsageLogs` collection

---

## 7. API Reference

**Base URL:** `http://localhost:4000`

### Authentication (`/api/auth/*`)

Handled entirely by BetterAuth. These endpoints are automatically available:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/sign-up/email` | Register a new user |
| POST | `/api/auth/sign-in/email` | Login with email/password |
| POST | `/api/auth/sign-out` | Logout |
| GET | `/api/auth/get-session` | Get current session |

---

### Registered APIs (`/api/apis`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/apis` | List all registered APIs |
| POST | `/api/apis` | Register a new upstream API |
| DELETE | `/api/apis/:id` | Delete an API + all its keys |

**POST `/api/apis` — Request Body:**
```json
{
  "name": "Pokémon API",
  "baseUrl": "https://pokeapi.co/api/v2",
  "description": "Free Pokémon data API, no auth needed",
  "category": "Gaming",
  "pricing": {
    "freeQuota": 1000,
    "pricePer100Requests": 0
  },
  "ownerId": "user_abc123"
}
```

**Response `201`:**
```json
{
  "_id": "6638a1f2b3c4d5e6f7a8b9c0",
  "name": "Pokémon API",
  "baseUrl": "https://pokeapi.co/api/v2",
  "description": "Free Pokémon data API, no auth needed",
  "category": "Gaming",
  "pricing": { "freeQuota": 1000, "pricePer100Requests": 0 },
  "ownerId": "user_abc123",
  "createdAt": "2026-05-02T11:00:00.000Z"
}
```

---

### API Keys (`/api/keys`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/keys?userId=<userId>` | List all keys for a user |
| POST | `/api/keys` | Generate a new API key |
| DELETE | `/api/keys/:id` | Revoke/delete a key |

**POST `/api/keys` — Request Body:**
```json
{
  "apiId": "6638a1f2b3c4d5e6f7a8b9c0",
  "userId": "user_abc123"
}
```

**Response `201`:**
```json
{
  "_id": "663ab1c2d3e4f5a6b7c8d9e0",
  "key": "mf_live_k5j2x9q3r7m",
  "apiId": "6638a1f2b3c4d5e6f7a8b9c0",
  "userId": "user_abc123",
  "status": "active",
  "rateLimitConfig": { "requestsPerMinute": 60 },
  "createdAt": "2026-05-02T12:00:00.000Z"
}
```

---

### Gateway (`/gateway/*`)

| Method | Endpoint | Description |
|---|---|---|
| ANY | `/gateway/<path>` | Proxy any request through the API gateway |

**Required Header:**
```
x-api-key: mf_live_abc123xyz456789
```

The `<path>` after `/gateway` is appended to the upstream API's `baseUrl`.

---

### Analytics (`/api/analytics`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/usage?userId=<userId>` | Get last 100 usage logs for a user |

**Response:**
```json
[
  {
    "_id": "...",
    "apiKeyId": "...",
    "apiId": "...",
    "userId": "user_abc123",
    "endpoint": "/gateway/pokemon/pikachu",
    "statusCode": 200,
    "latencyMs": 342,
    "billingMonth": "2026-05",
    "timestamp": "2026-05-02T12:01:00.000Z"
  }
]
```

---

### Billing (`/api/billing`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/billing?userId=<userId>` | Get all billing records for a user |
| POST | `/api/billing/calculate` | Manually trigger billing calculation for a month |

**POST `/api/billing/calculate` — Request Body:**
```json
{ "month": "2026-05" }
```

**Response `200`:**
```json
{ "message": "Billing calculation complete" }
```

---

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check if the backend is alive |

**Response:** `MeterFlow Backend is running`

---

## 8. Testing with Postman — Complete Guide

### Setup Postman Environment

1. Open Postman → Click **Environments** (top right) → **New Environment**
2. Name it `MetricFlow Local`
3. Add variables:

| Variable | Initial Value |
|---|---|
| `base_url` | `http://localhost:4000` |
| `api_key` | *(leave blank — fill after Step 3)* |
| `user_id` | *(leave blank — fill after Step 1)* |
| `api_id` | *(leave blank — fill after Step 2)* |

---

### Postman Test 1 — Register a User

```
Method: POST
URL:    {{base_url}}/api/auth/sign-up/email

Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "email": "test@metricflow.dev",
  "password": "Test@1234",
  "name": "Test User"
}
```

**Expected Response `200`:**
```json
{
  "user": {
    "id": "user_abc123...",
    "email": "test@metricflow.dev",
    "name": "Test User"
  },
  "session": { ... }
}
```

> 📋 Copy the `user.id` value and paste it into the `user_id` Postman environment variable.

---

### Postman Test 2 — Login (if already registered)

```
Method: POST
URL:    {{base_url}}/api/auth/sign-in/email

Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "email": "test@metricflow.dev",
  "password": "Test@1234"
}
```

---

### Postman Test 3 — Register the Pokémon API

```
Method: POST
URL:    {{base_url}}/api/apis

Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "name": "Pokémon API",
  "baseUrl": "https://pokeapi.co/api/v2",
  "description": "Free Pokémon data — no upstream auth needed",
  "category": "Gaming",
  "pricing": {
    "freeQuota": 1000,
    "pricePer100Requests": 0
  },
  "ownerId": "{{user_id}}"
}
```

**Expected Response `201`:**
```json
{
  "_id": "6638a1f2b3c4d5e6f7a8b9c0",
  "name": "Pokémon API",
  "baseUrl": "https://pokeapi.co/api/v2",
  ...
}
```

> 📋 Copy the `_id` value and paste it into the `api_id` environment variable.

---

### Postman Test 4 — Generate an API Key

```
Method: POST
URL:    {{base_url}}/api/keys

Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "apiId": "{{api_id}}",
  "userId": "{{user_id}}"
}
```

**Expected Response `201`:**
```json
{
  "_id": "663ab1c2d3e4f5a6b7c8d9e0",
  "key": "mf_live_k5j2x9q3r7m",
  "apiId": "{{api_id}}",
  "userId": "{{user_id}}",
  "status": "active",
  "rateLimitConfig": { "requestsPerMinute": 60 }
}
```

> 📋 Copy the `key` value (e.g. `mf_live_k5j2x9q3r7m`) and paste it into the `api_key` environment variable.

---

### Postman Test 5 — Call the Gateway (Pokémon API)

This is the **main gateway test**. MetricFlow will proxy this request to PokéAPI.

```
Method: GET
URL:    {{base_url}}/gateway/pokemon/pikachu

Headers:
  x-api-key: {{api_key}}
```

**Expected Response `200`:**
```json
{
  "id": 25,
  "name": "pikachu",
  "base_experience": 112,
  "height": 4,
  "weight": 60,
  "abilities": [ ... ],
  "types": [
    { "slot": 1, "type": { "name": "electric", "url": "..." } }
  ],
  "sprites": {
    "front_default": "https://raw.githubusercontent.com/.../pikachu.png",
    ...
  },
  "stats": [ ... ],
  "moves": [ ... ]
}
```

> ✅ Every successful gateway call automatically writes a `UsageLog` entry in MongoDB.

**More Pokémon Gateway Examples:**

```
GET {{base_url}}/gateway/pokemon/ditto         → Get Ditto's data
GET {{base_url}}/gateway/pokemon/charizard     → Get Charizard
GET {{base_url}}/gateway/pokemon/1             → Get Bulbasaur by ID
GET {{base_url}}/gateway/ability/blaze         → Get Blaze ability details
GET {{base_url}}/gateway/type/fire             → Get Fire type data
GET {{base_url}}/gateway/pokemon?limit=10&offset=0 → List first 10 Pokémon
```

---

### Postman Test 6 — Invalid API Key (Error Case)

```
Method: GET
URL:    {{base_url}}/gateway/pokemon/pikachu

Headers:
  x-api-key: mf_live_INVALID_KEY
```

**Expected Response `401`:**
```json
{
  "error": "Invalid or revoked API key"
}
```

---

### Postman Test 7 — Missing API Key (Error Case)

```
Method: GET
URL:    {{base_url}}/gateway/pokemon/pikachu
(No x-api-key header)
```

**Expected Response `401`:**
```json
{
  "error": "Missing x-api-key header"
}
```

---

### Postman Test 8 — View Usage Analytics

```
Method: GET
URL:    {{base_url}}/api/analytics/usage?userId={{user_id}}
```

**Expected Response `200`:**
```json
[
  {
    "userId": "user_abc123",
    "endpoint": "/gateway/pokemon/pikachu",
    "statusCode": 200,
    "latencyMs": 342,
    "billingMonth": "2026-05",
    "timestamp": "2026-05-02T12:00:00.000Z"
  },
  ...
]
```

---

### Postman Test 9 — Trigger Billing Calculation

```
Method: POST
URL:    {{base_url}}/api/billing/calculate

Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "month": "2026-05"
}
```

**Expected Response `200`:**
```json
{
  "message": "Billing calculation complete"
}
```

---

### Postman Test 10 — View Billing Records

```
Method: GET
URL:    {{base_url}}/api/billing?userId={{user_id}}
```

**Expected Response `200`:**
```json
[
  {
    "userId": "user_abc123",
    "apiId": { "_id": "...", "name": "Pokémon API" },
    "billingMonth": "2026-05",
    "totalRequests": 42,
    "billableRequests": 0,
    "amountDue": 0,
    "status": "pending"
  }
]
```

> `billableRequests` = 0 because Pokémon API's `freeQuota` is 1000. You'd need 1001+ requests for any charge.

---

## 9. Pokémon API — Real Example Walkthrough

The **Pokémon API** (`https://pokeapi.co`) is the perfect test API for MetricFlow because:
- It is completely **free** with no authentication required
- It has rich, nested data (perfect for verifying proxied responses)
- It has many endpoints to stress-test the gateway

### How the proxy path works

| Your Request to MetricFlow | Forwarded to PokeAPI |
|---|---|
| `GET /gateway/pokemon/pikachu` | `GET https://pokeapi.co/api/v2/pokemon/pikachu` |
| `GET /gateway/pokemon/charizard` | `GET https://pokeapi.co/api/v2/pokemon/charizard` |
| `GET /gateway/ability/overgrow` | `GET https://pokeapi.co/api/v2/ability/overgrow` |
| `GET /gateway/pokemon?limit=5` | `GET https://pokeapi.co/api/v2/pokemon?limit=5` |

The gateway strips `/gateway` from the path, appends the remainder to the `baseUrl`, and forwards.

### Verifying it works end-to-end

1. Make a `GET /gateway/pokemon/mewtwo` request in Postman with a valid key
2. Check MongoDB `usagelogs` collection — you'll see a new document for that request
3. Run `POST /api/billing/calculate` with `{"month": "2026-05"}`
4. Check MongoDB `billings` — a record appears showing `totalRequests: 1`

---

## 10. Billing System Explained

### How Billing Works

MetricFlow uses a **usage-based billing** model:

```
billableRequests = MAX(0, totalRequests - freeQuota)
amountDue        = (billableRequests / 100) * pricePer100Requests
```

### Example

| Scenario | Total Requests | Free Quota | Billable | Price/100 | Amount Due |
|---|---|---|---|---|---|
| Pokémon API (free) | 500 | 1000 | 0 | ₹0 | ₹0 |
| Custom API (paid) | 1500 | 1000 | 500 | ₹10 | ₹50 |
| Custom API (paid) | 250 | 100 | 150 | ₹5 | ₹7.50 |

### Billing Statuses

| Status | Meaning |
|---|---|
| `pending` | Billing calculated, awaiting payment |
| `paid` | Marked as paid (update manually or via payment gateway) |

### When to Run Billing

You can trigger billing:

1. **Manually via Postman** — `POST /api/billing/calculate` with `{"month": "2026-05"}`
2. **Programmatically** — set up a cron job or BullMQ worker to call `calculateBilling("2026-05")` at month-end

Billing is **idempotent** — running it multiple times for the same month updates the existing record (upsert) rather than creating duplicates.

---

## 11. Dashboard & Charts

The frontend dashboard at **http://localhost:3000** has four sections:

### Overview (Home `/`)
- Summary cards: Total Requests, Active Keys, APIs Registered, Total Spend
- Bar chart showing **daily request volume** for the current month (via Recharts)

### APIs (`/apis`)
- Grid of all registered APIs with their name, base URL, and free quota
- **Add New API** button → opens a modal form
- **Delete** button → removes the API and all associated keys

### API Keys (`/keys`)
- Table of all your generated keys
- Each row shows the masked key (`mf_live_abc...xyz`), linked API name, status badge (`Active`/`Revoked`), and creation date
- **Copy** icon to copy the full key to clipboard
- **Generate New Key** button

### Analytics (`/analytics`)
- Bar chart of requests per day for the current billing month
- Powered by usage logs fetched from `GET /api/analytics/usage`

### Billing (`/billing`)
- Table of monthly billing records
- Shows: API name, billing month, total requests, billable requests, amount due, status

---

## 12. Data Models

### API
```typescript
{
  name: string;                  // "Pokémon API"
  baseUrl: string;               // "https://pokeapi.co/api/v2"
  description: string;
  category: string;              // "Gaming"
  pricing: {
    freeQuota: number;           // Default: 1000 requests/month free
    pricePer100Requests: number; // Default: 0 (free)
  };
  upstreamAuthParam?: string;    // e.g. "appid" for OpenWeather
  upstreamAuthKey?: string;      // The actual upstream secret
  ownerId: string;               // User who registered this API
}
```

### APIKey
```typescript
{
  key: string;              // "mf_live_abc123..."
  apiId: ObjectId;          // Ref → API
  userId: string;           // Owner of this key
  status: "active" | "revoked";
  rateLimitConfig: {
    requestsPerMinute: number; // Default: 60
  };
}
```

### UsageLog
```typescript
{
  apiKeyId: ObjectId;   // Ref → APIKey
  apiId: ObjectId;      // Ref → API
  userId: string;
  endpoint: string;     // "/gateway/pokemon/pikachu"
  statusCode: number;   // 200, 404, 500...
  latencyMs: number;    // Response time in ms
  billingMonth: string; // "2026-05"
  timestamp: Date;      // Auto-deleted after 90 days (TTL index)
}
```

### Billing
```typescript
{
  userId: string;
  apiId: ObjectId;          // Ref → API
  billingMonth: string;     // "2026-05"
  totalRequests: number;
  billableRequests: number; // MAX(0, total - freeQuota)
  amountDue: number;        // In smallest currency unit
  status: "pending" | "paid";
}
```

---

## Quick Reference — Postman Sequence Cheat Sheet

```
1. POST  /api/auth/sign-up/email        → Register
2. POST  /api/apis                      → Register Pokémon API → save _id as api_id
3. POST  /api/keys                      → Generate key → save key as api_key
4. GET   /gateway/pokemon/pikachu       → x-api-key: {{api_key}}  ← main gateway call
5. GET   /api/analytics/usage?userId=.. → View logs
6. POST  /api/billing/calculate         → {"month":"2026-05"}
7. GET   /api/billing?userId=..         → View billing
8. GET   /health                        → Backend health check
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `Missing x-api-key header` | No `x-api-key` header sent | Add `x-api-key: mf_live_...` to your Postman request |
| `Invalid or revoked API key` | Wrong key or key is revoked | Re-copy key from dashboard or generate a new one |
| `No APIs available` | No API registered yet | Complete Step 2 — register an API first |
| `Failed to create API` | Missing required fields | Ensure `name`, `baseUrl`, and `ownerId` are in the body |
| `Too Many Requests` | Over 60 requests/minute | Wait 1 minute and retry |
| Backend not connecting | MongoDB URI wrong | Check `MONGODB_URI` in `backend/.env` |

---

## License

MIT © MetricFlow / Labmentix Projects 2026
