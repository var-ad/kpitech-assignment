# Food Ordering System

Two roles (Admin, Customer), FastAPI backend, React+TypeScript frontend, AI-powered natural language menu search.

## Stack

- Backend: FastAPI (async), SQLAlchemy 2.0, Pydantic v2, psycopg 3, postgresSQL (Supabase)
- Frontend: React, Vite, Tailwind CSS v4, React Router, axios
- AI search: DeepSeek LLM for query parsing and candidate ranking
- Fonts: Sora (headings/prices) + DM Sans (body) loaded via Google Fonts

## Color palette (Kitchen Bistro)

- Page bg: `#F5F0EB` (warm stone)
- Accent: `#D43B1F` (chili red — replaces Tailwind orange-500 throughout)
- Text heading: `#1A1410` (deep warm brown)
- Text body: `#5C4F42` (warm brown)
- Borders: `#E5DDD3` (warm tan)
- Admin surfaces use a denser variant: `#F7F5F3` header bg, `#E2DCD3` borders, `#7A6F62` muted text

## Commands

- Backend venv activate: `.venv/Scripts/activate` (Windows) or `source .venv/bin/activate` (Unix, from /backend)
- Backend dev server: `.venv/Scripts/uvicorn app.main:app --reload` (Windows) or `uvicorn app.main:app --reload` (Unix, from /backend)
- Backend tests: `pytest` (from /backend)
- Alembic migrations: `alembic revision --autogenerate -m "msg"` and `alembic upgrade head` (from /backend)
- Frontend dev server: `npm run dev` (from /frontend)
- Frontend build: `npm run build` (from /frontend)
- Seed admin: `.venv/Scripts/python -m app.seed_admin` (from /backend)

## Data model (minimum entities — don't collapse these)

- User: id, name, email, password_hash, role (admin | customer)
- MenuItem: id, name, description, price, category, available (bool), is_vegetarian, is_spicy, **cooking_method** (enum: none/fried/steamed/grilled/baked/roasted/boiled/raw), created_at, updated_at
- Order: id, status, total_amount, created_at, updated_at (guest checkout — no customer_id FK)
- OrderItem: id, order_id, menu_item_id, quantity, unit_price

## Domain decisions

- **Order status only moves forward, one step at a time:**
  Placed → Confirmed → Preparing → Ready → Picked Up.
  No skipping steps, no going backward. Admin is the only role that can advance status. Return HTTP 400.
- **Roles are Admin and Customer only.** Every admin-only route must check the role via a dependency.
- Order ownership: not enforced — orders are guest-checkout by design.
- Price snapshot: OrderItem.unit_price is copied from MenuItem.price at order-creation time and never recalculated. This is a real bug class, not a nice-to-have.
- Soft delete only: menu items are never hard-deleted. Removing an item sets `deleted_at`. Hard-deleting breaks order history.

## AI search design

The search pipeline has three stages:

1. **Query parsing** — DeepSeek LLM (fallback: regex) parses the query into:
   - `max_price` / `min_price` — integer or null
   - `is_vegetarian` / `is_spicy` — bool or null
   - `cooking_method_include` / `cooking_method_exclude` — list of strings
   - `semantic_description` — remaining fuzzy intent (e.g. "light lunch")

2. **Deterministic hard filters** (SQL):
   - Price filters (`price <= max_price`, `price >= min_price`)
   - Vegetarian / spicy boolean columns
   - Cooking method: `IN (include)` or `NOT IN (exclude)` against the `cooking_method` enum column
   - Cascade relaxation: price → veg/spicy/cooking_method → all (same order, dropped one at a time when zero results)

3. **LLM-based fuzzy ranking** (`app/services/llm_rank.py`):
   - Candidates capped at 30 items to control token usage
   - Single item short-circuits (no LLM call needed)
   - LLM prompt: "Given the user's search intent: '{semantic_description}' (original query: '{query}'), rank these items..."
   - Returns `[{id, score: 0-1}]` sorted by relevance
   - On parse/API failure: returns candidates unranked with `score=None` — never fails the request

See `app/routers/search.py` for the pipeline and `app/services/llm_rank.py` for the ranking call.

## Auth

- Login endpoint issues a JWT for both roles.
- One seeded admin account — no admin self-registration.
- Simple customer signup: email + password (hashed with passlib/bcrypt).
- No email verification, no password reset flow, no OAuth — out of scope.
- Role comes from the JWT claim, checked via a FastAPI dependency.

## Code style

- Pydantic schemas are separate from SQLAlchemy models.
- Every route returns a proper HTTP status code.
- Admin-only endpoints check role via a dependency, not inline if-checks.
- Frontend: React Router with `/admin` and `/customer` (redirects `/` to `/customer`).
- Customer views use the Kitchen Bistro palette; Admin uses a denser back-office variant.
- API route prefixes: `/api/auth/`, `/api/menu/`, `/api/admin/`, `/api/orders/`.
- CORS configured for `http://localhost:5173`.

## Workflow

- Run `pytest` after any model, schema, or route change before moving to the next feature.
- Batch full vertical slices (model + schema + route + test) rather than one file at a time.
- Don't install a new dependency for something the standard library or native browser feature covers.
- If a design decision changes, update this file.
