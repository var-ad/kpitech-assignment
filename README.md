# Varad's Kitchen - Food Ordering System

A full-stack restaurant ordering platform with two user roles (admin, customer) and an AI-powered natural-language menu search. Customers browse a menu, search in plain English ("a light lunch that isn't fried"), build a cart, and place orders without requiring an account. Admins manage menu items, monitor orders through a 5-stage workflow (Placed → Confirmed → Preparing → Ready → Picked Up), and view aggregated dashboard metrics. The search pipeline uses DeepSeek LLM for both structured query parsing and fuzzy ranking, but degrades gracefully to a regex parser + unranked results when the LLM is unavailable.

---

## Architecture

```
┌─────────────────┐      ┌─────────────────────────────────────┐      ┌──────────────┐
│   React 19      │      │         FastAPI (Python)             │      │  PostgreSQL  │
│   Vite + TS     │      │                                      │      │  (Supabase)  │
│   Tailwind v4   │      │  ┌──────────┐   ┌────────────────┐   │      │              │
│                 │ HTTP  │  │ Routers  │──▶│  SQLAlchemy    │───┼─────▶│  users       │
│  /customer  ────┼──────┼──┼──────────┤   │  ORM + Filters │   │      │  menu_items  │
│  /admin     ────┼──────┼──│ (auth,   │   └────────────────┘   │      │  orders      │
│                 │      │  │  menu,   │         │              │      │  order_items │
│  CartProvider   │      │  │  orders, │    ┌────▼───────────┐  │      └──────────────┘
│  AuthProvider   │      │  │  search, │    │  LLM Ranking   │  │
│  ToastProvider  │      │  │  dashbrd)│    │  (app/services  │  │
│                 │      │  └──────────┘    │   /llm_rank.py) │  │
└─────────────────┘      │                   └────┬───────────┘  │
                         │                        │              │
                         │              ┌─────────▼──────────┐   │
                         │              │  DeepSeek Chat API  │   │
                         │              │  (OpenAI-compatible)│   │
                         │              └────────────────────┘   │
                         └─────────────────────────────────────┘
```

### Search pipeline detail

```
User query ("light lunch not fried")
        │
        ▼
┌───────────────────────────────┐
│  1. LLM structured parsing    │  ← DeepSeek extracts:
│     (_llm_parse_query)        │     {max_price, is_vegetarian, is_spicy,
│                               │      cooking_method_include/exclude,
│                               │      semantic_description}
└───────────┬───────────────────┘
            │ (falls back to regex keyword parser if LLM unavailable)
            ▼
┌───────────────────────────────┐
│  2. Deterministic SQL filters │  ← price, vegetarian/spicy booleans,
│     (hard constraints)        │     cooking_method IN/NOT IN
└───────────┬───────────────────┘
            │ (cascade relax: price → veg/spicy/cooking → all if zero results)
            ▼
┌───────────────────────────────┐
│  3. LLM fuzzy ranking         │  ← DeepSeek ranks remaining shortlist
│     (rank_candidates)         │     against semantic_description
└───────────┬───────────────────┘
            │ (falls back to unranked list if LLM unavailable)
            ▼
      Ranked results returned to client
```

---

## Database Schema

### `users`

| Column        | Type         | Notes                  |
| ------------- | ------------ | ---------------------- |
| id            | integer PK   | auto-increment         |
| name          | varchar(255) | display name           |
| email         | varchar(255) | unique, used for login |
| password_hash | varchar(255) | bcrypt via passlib     |
| role          | enum         | `admin` or `customer`  |
| created_at    | timestamptz  | server default `now()` |

### `menu_items`

| Column                  | Type          | Notes                                                                      |
| ----------------------- | ------------- | -------------------------------------------------------------------------- |
| id                      | integer PK    | auto-increment                                                             |
| name                    | varchar(255)  |                                                                            |
| description             | text          | nullable                                                                   |
| category                | varchar(100)  | e.g. "Main Course", "Starters"                                             |
| price                   | numeric(10,2) | CHECK >= 0                                                                 |
| is_vegetarian           | boolean       | default false                                                              |
| is_spicy                | boolean       | default false                                                              |
| available               | boolean       | default true; soft-disable                                                 |
| **cooking_method**      | enum          | `none`, `fried`, `steamed`, `grilled`, `baked`, `roasted`, `boiled`, `raw` |
| deleted_at              | timestamptz   | nullable — soft delete marker                                              |
| created_at / updated_at | timestamptz   | server defaults                                                            |

### `orders`

| Column                  | Type          | Notes                                                                       |
| ----------------------- | ------------- | --------------------------------------------------------------------------- |
| id                      | integer PK    | auto-increment                                                              |
| status                  | enum          | `placed` → `confirmed` → `preparing` → `ready` → `picked_up` (forward only) |
| total_amount            | numeric(10,2) | sum of line items at order time                                             |
| created_at / updated_at | timestamptz   |                                                                             |

No `customer_id` FK — guest checkout by design (frictionless like most food delivery apps).

### `order_items`

| Column       | Type                       | Notes                                                               |
| ------------ | -------------------------- | ------------------------------------------------------------------- |
| id           | integer PK                 |                                                                     |
| order_id     | integer FK → orders.id     |                                                                     |
| menu_item_id | integer FK → menu_items.id |                                                                     |
| quantity     | integer                    | > 0                                                                 |
| unit_price   | numeric(10,2)              | **snapshotted** at creation — not recalculated from live menu price |

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- A Supabase (PostgreSQL) project
- A DeepSeek API key (or any OpenAI-compatible endpoint)

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Unix
source .venv/bin/activate

pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase URL, DeepSeek key, JWT secret, admin credentials

# Run migrations
alembic upgrade head

# Seed the admin user
python -m app.seed_admin

# Start dev server
uvicorn app.main:app --reload   # → http://localhost:8000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                     # → http://localhost:5173
```

**Verify:** `curl http://localhost:8000/api/health` → `{"status":"ok"}`

---

## Environment Variables

| Variable            | Required | Default                       | Description                                                                                 |
| ------------------- | -------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | Yes      | —                             | Supabase pooler connection string (`postgresql://user:pass@host:6543/db`)                   |
| `JWT_SECRET`        | Yes      | —                             | Secret key for signing JWT tokens (change in production)                                    |
| `DEEPSEEK_API_KEY`  | No       | —                             | DeepSeek/OpenAI-compatible API key. If unset, search uses keyword parser + unranked results |
| `DEEPSEEK_BASE_URL` | No       | `https://api.deepseek.com/v1` | Allows swapping to a different OpenAI-compatible endpoint                                   |
| `ADMIN_EMAIL`       | No       | —                             | Email for the seeded admin account                                                          |
| `ADMIN_PASSWORD`    | No       | —                             | Password for the seeded admin account                                                       |
| `VITE_API_URL`      | No       | `http://localhost:8000`       | Frontend API base URL (Vite env var)                                                        |

---

## API Overview

All endpoints return JSON. Auth-protected endpoints accept `Authorization: Bearer <token>`.

### Auth

| Method | Path                 | Auth | Description                          |
| ------ | -------------------- | ---- | ------------------------------------ |
| POST   | `/api/auth/register` | No   | Create a customer account            |
| POST   | `/api/auth/login`    | No   | Returns `{access_token, token_type}` |
| GET    | `/api/auth/me`       | JWT  | Current user info                    |

### Menu (customer)

| Method | Path                   | Auth | Description                  |
| ------ | ---------------------- | ---- | ---------------------------- |
| GET    | `/api/menu`            | No   | Available, non-deleted items |
| GET    | `/api/menu/{id}`       | No   | Single item detail           |
| GET    | `/api/menu/categories` | No   | Distinct category list       |

### Menu (admin)

| Method | Path                                      | Auth  | Description                     |
| ------ | ----------------------------------------- | ----- | ------------------------------- |
| POST   | `/api/admin/menu-items`                   | Admin | Create item                     |
| GET    | `/api/admin/menu-items`                   | Admin | List all items (incl. deleted)  |
| GET    | `/api/admin/menu-items/{id}`              | Admin | Single item                     |
| PUT    | `/api/admin/menu-items/{id}`              | Admin | Update item                     |
| PATCH  | `/api/admin/menu-items/{id}/availability` | Admin | Toggle `available`              |
| DELETE | `/api/admin/menu-items/{id}`              | Admin | Soft delete (sets `deleted_at`) |

### Orders

| Method | Path                            | Auth  | Description                              |
| ------ | ------------------------------- | ----- | ---------------------------------------- |
| POST   | `/api/orders`                   | No    | Place order (guest checkout)             |
| GET    | `/api/orders/{id}`              | No    | Order status & items                     |
| GET    | `/api/admin/orders`             | Admin | List orders (optional `?status=` filter) |
| PATCH  | `/api/admin/orders/{id}/status` | Admin | Advance status (one step forward only)   |

### Search

| Method | Path               | Auth | Description                                                      |
| ------ | ------------------ | ---- | ---------------------------------------------------------------- |
| POST   | `/api/menu/search` | No   | Natural-language menu search                                     |
|        |                    |      | Body: `{"query": "a light lunch not fried"}`                     |
|        |                    |      | Returns ranked items with `score` (0–1) + `relaxed_filters` flag |

### Dashboard

| Method | Path                   | Auth  | Description                                             |
| ------ | ---------------------- | ----- | ------------------------------------------------------- |
| GET    | `/api/admin/dashboard` | Admin | Today's revenue, orders-by-status counts, popular items |

---

## AI Search Design

The search endpoint uses a **three-stage pipeline** that separates deterministic filtering from fuzzy relevance:

1. **LLM structured extraction** — The user's raw query is sent to DeepSeek (chat completion, temperature 0) with a prompt that asks it to return typed JSON: `{max_price, is_vegetarian, is_spicy, cooking_method_include, cooking_method_exclude, semantic_description}`. This gives us precise control over hard filters (price range, dietary preference, cooking method) while isolating the vague/intent part ("light", "healthy", "hearty") into a separate field for the next stage.

2. **Deterministic SQL filters** — The structured fields become SQL WHERE clauses on indexed columns. If a filter returns zero results, the system relaxes one constraint at a time (price → dietary → cooking method → all items) so the user always sees something useful rather than a blank page. This stage is pure SQL — no AI, no ambiguity.

3. **LLM candidate ranking** — The remaining shortlist (capped at 30 items) is sent back to DeepSeek with the original query and the semantic description, asking it to rank by relevance. Items judged irrelevant by the LLM are discarded. If the LLM call fails or the API key is unset, the endpoint returns the filtered list unranked — it never crashes.

This design was chosen over a pure-vector-search or general-chatbot approach for three reasons:

- **Explainability** — Each search result can be traced back to a specific decision (LLM said "this is lunch food" → category match → score boost). There is no black-box embedding where neither the system nor the user knows why item X ranked higher than Y.
- **Cost & latency** — Two small LLM calls (parse + rank) at temperature 0 consume roughly 400–800 tokens per search. A naive chatbot that "just answers the question" would consume 5–10× the tokens and be harder to constrain to the actual menu data.
- **Demo reliability** — The regex keyword fallback means the entire search pipeline works with zero external dependencies. The LLM is an enhancement that makes results smarter, not a gate that makes them stop working.

---

## Demo Credentials

| Role     | Email                                                          | Password   |
| -------- | -------------------------------------------------------------- | ---------- |
| Admin    | `admin@foodorder.com`                                          | `admin123` |
| Customer | Register via `/api/auth/register` or the frontend sign-up form | —          |

---

## Known Limitations & Future Improvements

- **No order ownership** — Orders are guest-checkout by design (no customer_id FK). This keeps friction low but means there is no "my orders" page without an account. A future feature could link orders to authenticated customers via a JWT-scoped query.
- **No embedding-based search** — For a small menu (<100 items), the LLM ranking approach is fast and cheap. A larger catalogue (>500 items) would benefit from pre-computed embeddings (pgvector) so the ranking stage receives fewer candidates. The `Vector(384)` column already exists on `menu_items` but is not yet populated.
- **No rate limiting** — The `/api/menu/search` endpoint calls an external LLM on every request. A production deployment should add per-IP rate limiting (or token-bucket) to prevent abuse that would run up the DeepSeek bill.
- **Cooking method enum is static** — The `CookingMethod` enum is defined in Python and requires a migration to add new values. A future version could store cooking methods as a separate table with admin-configurable options.
- **No email verification or password reset** — Customer accounts are created with just an email + password. Production-ready auth would need email confirmation and a reset flow.
