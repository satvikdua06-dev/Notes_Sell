# Notarium — Chapter-wise Notes Marketplace

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres, Redis, MinIO)
- `poppler-utils` for PDF rasterization:
  - **Windows**: `choco install poppler` or [download from here](https://github.com/oschwartz10612/poppler-windows/releases)
  - **Mac**: `brew install poppler`
  - **Linux**: `apt install poppler-utils`

### 2. Environment

```bash
cp .env.example .env
# Fill in RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
# from Razorpay Dashboard → Settings → API Keys (use Test Mode keys)
```

### 3. Start services

```bash
docker-compose up -d
```

### 4. Backend

```bash
cd backend
npm install
npm run migrate     # Run DB migrations
npm run seed        # Upload placeholder PDFs + seed chapters
npm run dev         # Start backend on http://localhost:4000
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev         # Start frontend on http://localhost:5173
```

## Test accounts (after seeding)

| Role     | Email                       | Password   |
|----------|-----------------------------|------------|
| Admin    | admin@notarium.in         | admin123   |
| Reviewer | reviewer@notarium.in      | review123  |

*(Reviewer account is for Razorpay's review team — share these credentials when submitting for live-mode activation)*

## Razorpay test webhook

To simulate a successful payment in test mode:

1. Go to Razorpay Dashboard → Webhooks → Send test events
2. Select event: `payment.captured`
3. URL: `http://localhost:4000/api/webhooks/razorpay`
4. Use a real test order ID from a checkout attempt

## Architecture

```
frontend (Vite + React)   →   backend (Express)   →   PostgreSQL
                                     ↕                       ↕
                                   Redis               MinIO (S3)
                                     ↕
                                 Razorpay
```

## Security model

- Chapter PDFs never served directly — only server-rendered, per-user watermarked JPEG pages
- Every page endpoint requires: valid session JWT + DB purchase record
- Watermarks baked into pixels server-side (email + order ID + timestamp, tiled diagonally)
- Razorpay webhook signature verified server-side; idempotent via `webhook_events` table
- Viewer sessions are short-lived signed tokens (10 min, Redis-backed)
- All SQL uses parameterized queries; all IDs are UUIDs

## Razorpay live activation checklist

Required pages (all built, linked in footer):
- [x] /terms — Terms and Conditions
- [x] /privacy — Privacy Policy
- [x] /delivery — Delivery Policy
- [x] /cancellation — Cancellation & Refunds
- [x] /contact — Contact Us with real email
