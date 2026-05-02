# 📽️ MetricFlow: Project Presentation & Video Walkthrough Guide

Use this guide as a script and structure for your project submission video. It is designed to show off the technical depth, the user experience, and the "magic" behind the API Gateway.

---

## 🕒 Video Structure (Recommended: 5-8 Minutes)

1.  **Introduction (30s):** Who you are and what MetricFlow is.
2.  **The Problem & Solution (45s):** Why we need an API Gateway.
3.  **Core Feature Walkthrough (3m):** Register -> API -> Key -> Live Proxy.
4.  **Technical Deep Dive: The Gateway (1m 30s):** How the middleware works.
5.  **Analytics & Billing (1m):** Showing the business value (charts/invoices).
6.  **Conclusion (15s):** Final wrap-up.

---

## 🎤 Section 1: Introduction
**Talking Points:**
*   "Hello, I'm presenting **MetricFlow**, a usage-based API Gateway and Billing platform."
*   "MetricFlow allows developers to take any existing API, put it behind a secure gateway, track every single request, and automatically generate bills based on usage."

---

## 🎤 Section 2: Core Walkthrough (The "Live Demo" Part)
*Prepare your browser with the dashboard open.*

### Step 1: Authentication
*   "We start with a secure authentication system powered by **BetterAuth**. I'll log in to my dashboard."

### Step 2: Registering an API (The Target)
*   *Go to the APIs page.*
*   "Here, I can register any upstream service. For this demo, I've registered the **Pokémon API**."
*   "I simply provide the Base URL (`https://pokeapi.co/api/v2`) and set the pricing rules, like a free quota of 1,000 requests."

### Step 3: Generating the Key
*   *Go to the API Keys page.*
*   "To access this API through MetricFlow, I need a key. I'll generate a new one now."
*   "This key (`mf_live_...`) is uniquely linked to my user and the specific API."

### Step 4: The Live Proxy (Postman)
*   *Switch to Postman.*
*   "Now for the magic. I'm hitting my **local gateway** at `/gateway/pokemon/pikachu`."
*   "Notice I'm passing my `x-api-key` in the header."
*   **Action:** Send the request.
*   "The response comes back instantly from the Pokémon API, but it went through our gateway first."

---

## 🎤 Section 3: Technical Deep Dive (The "Brain")
*Explain the Backend Middleware Chain.*

**Key Concept to Explain:**
"The gateway isn't just a simple proxy; it's a **pipeline** of 5 critical steps:"

1.  **Validation:** We check if the `x-api-key` exists and is 'active' in MongoDB.
2.  **Rate Limiting:** We enforce a limit (e.g., 60 requests per minute) using an in-memory cache to prevent abuse.
3.  **Target Resolution:** We look up where the request should actually go (e.g., PokeAPI) and inject any hidden credentials if needed.
4.  **Logging:** We hook into the response `finish` event to capture latency and status codes **asynchronously** so we don't slow down the user.
5.  **Proxying:** Using `http-proxy-middleware`, we transparently stream the data from the upstream server back to the client.

---

## 🎤 Section 4: Analytics & Billing
*Back to the Dashboard.*

### Dashboard Charts
*   "Every request we just made in Postman was tracked. If I refresh my dashboard, you can see the **Real-time Charts** built with **Recharts**."
*   "We can see requests over time, response status distributions (200s vs 404s), and the most popular endpoints."

*   "This transforms a simple API into a revenue-generating product."

### 📝 Business Logic & Limits (Quick Facts)
*   **Rate Limiting:** Every API key has a default limit of **60 requests per minute**. This prevents DDoS attacks and server overload.
*   **Free Quota:** Every API can be configured with a free tier. By default, the first **1,000 requests per month** are completely free.
*   **Pricing:** After the free quota is exhausted, we charge based on a **"Price per 100 Requests"** model.
    *   *Example:* If an API is set to $10 per 100 requests, and a user makes 1,100 requests, they are billed for exactly 100 extra requests ($10).

---

## 🎤 Section 5: Key Technical Highlights (Bullet Points)
*Mention these for extra "points":*

*   **Tech Stack:** Next.js 14, Express.js, TypeScript, and MongoDB.
*   **Security:** Middleware-level protection and secure key hashing.
*   **Performance:** Asynchronous logging ensures the gateway adds near-zero latency.
*   **Scalability:** Usage-based logic that handles millions of logs via MongoDB indexing.

---

## 💡 Quick Tips for the Video:
1.  **Be Clear:** Explain *why* you are clicking a button before you click it.
2.  **Postman is King:** Showing the API response in Postman is the best proof that the gateway works.
3.  **Environment Variables:** Mention that the app is fully configurable via `.env` for easy deployment.
4.  **The "Why":** Remind the viewer that this helps developers monetize their APIs easily.

---
**Good luck with your submission! You've built a powerful, production-ready system.**
