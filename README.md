# Personal CFO — Multi-Agent System

An AI-powered personal finance management system that tracks expenses, categorizes transactions from GPay screenshots, and provides nightly recommendations to increase investments.

## 🎯 Goal
> **Increase Investment → Reduce Personal Expenditure**  
> Target: 30% of spending should go to investments

---

## Architecture

```
📱 GPay Screenshot  ──►  🔍 OCR Agent (Gemini Vision)
                              │
                              ▼
                    🏷️ Categorization Agent (Gemini LLM)
                              │
                    ┌─────────┴──────────┐
                    │                    │
              High confidence       Low confidence
                    │                    │
              💾 Auto-save         👤 Human Review UI
                    │                    │
                    └────────┬───────────┘
                             │
                    📊 Analytics Agent  ──►  Dashboard Charts
                             │
                    🌙 Alert Agent (9 PM nightly)
                             │
                    💡 Recommendation Agent (Gemini LLM)
```

## 🚀 Quick Start

### 1. Setup Backend

```bash
cd backend
cp .env.example .env
# Fill in your GOOGLE_API_KEY and GCP_PROJECT_ID in .env

pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

### 2. Setup Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8080

npm install
npm run dev
```

Open http://localhost:3000

### 3. Using Docker Compose (recommended)

```bash
cp backend/.env.example .env
# Fill in GOOGLE_API_KEY and GCP_PROJECT_ID
# Add your service-account.json to the root

docker-compose up --build
```

---

## 📂 Project Structure

```
CFO-Agent/
├── backend/                    # FastAPI + Multi-Agent Python
│   ├── agents/
│   │   ├── ocr_agent.py        # Gemini Vision — GPay screenshot parsing
│   │   ├── categorization_agent.py  # Gemini LLM — classify transactions
│   │   ├── persistence_agent.py     # Firestore CRUD
│   │   ├── analytics_agent.py       # Metrics & aggregations
│   │   ├── alert_agent.py           # Nightly 9PM digest (APScheduler)
│   │   └── recommendation_agent.py  # Gemini LLM — financial advice
│   ├── orchestrator/
│   │   └── agent_runner.py     # Pipeline coordinator
│   ├── models/
│   │   └── transaction.py      # Pydantic models
│   ├── api/
│   │   └── routes.py           # FastAPI endpoints
│   ├── config/settings.py
│   ├── main.py
│   └── Dockerfile
│
├── frontend/                   # Next.js 14 Dashboard
│   ├── app/
│   │   ├── dashboard/page.tsx  # Stacked bar + area charts + stats
│   │   ├── upload/page.tsx     # GPay screenshot upload & review
│   │   ├── manual/page.tsx     # Manual expense entry
│   │   ├── review/page.tsx     # Pending categorization review
│   │   └── alerts/page.tsx     # Nightly alerts history
│   ├── components/
│   │   ├── charts/
│   │   │   ├── DailyStackedBar.tsx
│   │   │   ├── CumulativeAreaChart.tsx
│   │   │   └── InvestmentDonut.tsx
│   │   ├── Navigation.tsx
│   │   ├── CategoryBadge.tsx
│   │   └── StatsCard.tsx
│   └── lib/
│       ├── api.ts              # API client
│       └── utils.ts            # Helpers (formatINR, etc.)
│
├── infrastructure/
│   ├── cloudbuild.yaml         # GCP Cloud Build CI/CD
│   └── firestore.rules         # Firestore security rules
│
└── docker-compose.yml
```

---

## 🏷️ Categories

| Category | Sub-categories | Goal |
|---|---|---|
| **Investment** | SIP, Mutual Fund, PPF, Stocks, NPS | 📈 Increase to 30%+ |
| **Insurance** | Health, Life, Vehicle | ✅ Maintain |
| **Loan_Repay** | Home Loan, Personal Loan, EMI | 📉 Reduce over time |
| **Personal_Expenditure** | Food, Shopping, Entertainment, Travel | ✂️ Cut down |
| **Others** | Miscellaneous | 🔍 Review regularly |

---

## 🌐 API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/transactions/upload-screenshot` | Upload GPay screenshot |
| GET | `/api/transactions/pending-review` | Get pending review items |
| POST | `/api/transactions/confirm-review` | Confirm/correct categorization |
| POST | `/api/transactions/manual` | Add manual transaction |
| GET | `/api/transactions` | List transactions (with filters) |
| GET | `/api/analytics/daily` | Daily stacked bar data |
| GET | `/api/analytics/cumulative` | Cumulative by-category data |
| GET | `/api/analytics/summary` | Dashboard summary stats |
| GET | `/api/alerts` | Nightly alerts history |
| POST | `/api/alerts/generate` | Trigger alert generation now |

---

## ☁️ GCP Deployment

### Prerequisites
- GCP project with Firestore enabled
- Gemini API key (from Google AI Studio)
- Service account with Firestore access

### Deploy

```bash
# Set up GCP
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com

# Create Firestore database
gcloud firestore databases create --region=asia-south1

# Store Gemini API key in Secret Manager
gcloud secrets create gemini-api-key --data-file=-  <<< "YOUR_API_KEY"

# Trigger Cloud Build (see "Login" below for these values)
gcloud builds submit --config infrastructure/cloudbuild.yaml \
  --substitutions=_ALLOWED_EMAILS=you@gmail.com,_FIREBASE_API_KEY=...,_FIREBASE_APP_ID=...
```

### Login
Every `/api/*` route requires a Google sign-in. The web app signs in with
Firebase Auth and sends the ID token as `Authorization: Bearer <token>`; the
backend verifies it and only accepts emails listed in `ALLOWED_EMAILS`
(empty means nobody gets in). `/health` and `/` stay open.

1. In the Firebase console, add Firebase to your GCP project, then
   Authentication > Sign-in method > enable **Google**.
2. Authentication > Settings > Authorized domains: add your frontend's domain.
3. Project settings > Your apps > add a Web app, and copy its `apiKey` and
   `appId` into `frontend/.env.local` (and the Cloud Build substitutions).
4. Set `ALLOWED_EMAILS` on the backend to your Google account.

For local development without Firebase, set `AUTH_DISABLED=true` in
`backend/.env` and `NEXT_PUBLIC_AUTH_DISABLED=true` in `frontend/.env.local`.

### Cloud Scheduler (Nightly Alerts)
The APScheduler inside the backend handles 9 PM IST nightly alerts automatically.
For production resilience, also set up Cloud Scheduler:

```bash
gcloud scheduler jobs create http nightly-cfo-alert \
  --location=asia-south1 \
  --schedule="0 21 * * *" \
  --time-zone="Asia/Kolkata" \
  --uri="https://YOUR_CLOUD_RUN_URL/api/alerts/generate" \
  --http-method=POST \
  --message-body="{}" \
  --oidc-service-account-email=SCHEDULER_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --oidc-token-audience="https://YOUR_CLOUD_RUN_URL"
```
The API needs a login for this call too: set `API_AUDIENCE` to the Cloud Run URL
and add the scheduler service account's email to `ALLOWED_EMAILS`.

---

## 🔑 Environment Variables

### Backend
| Variable | Description |
|---|---|
| `GOOGLE_API_KEY` | Gemini API key |
| `GCP_PROJECT_ID` | GCP project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON |
| `ALLOWED_EMAILS` | Comma-separated Google accounts allowed to use the API (empty = nobody) |
| `FIREBASE_PROJECT_ID` | Firebase project for sign-in tokens (defaults to `GCP_PROJECT_ID`) |
| `API_AUDIENCE` | Cloud Run URL, for Cloud Scheduler OIDC calls |
| `AUTH_DISABLED` | `true` skips login checks (local development only) |
| `MONTHLY_INVESTMENT_GOAL_PCT` | Investment goal % (default: 30) |
| `NIGHTLY_ALERT_HOUR` | Alert hour in IST (default: 21) |

### Frontend
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL |

