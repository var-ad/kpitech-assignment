# Varad's Kitchen - Project Notes

Two roles: Admin and Customer. Backend is FastAPI. Frontend is React,
TypeScript, Vite, React Router, axios, and Tailwind/CSS styling. The app is a
guest-checkout food ordering system with AI-powered menu search.

## Current Routes

- Customer app: `/`
- Legacy customer route: `/customer` redirects to `/`
- Admin app: `/admin`
- Unknown frontend routes render a small not-found screen with a link home

## Commands

- Backend venv activate: `.venv\Scripts\activate` from `backend`
- Backend dev server: `.venv\Scripts\uvicorn app.main:app --reload` from `backend`
- Alembic migrate: `alembic upgrade head` from `backend`
- Seed admin: `.venv\Scripts\python -m app.seed_admin` from `backend`
- Frontend dev server: `npm run dev` from `frontend`
- Frontend build: `npm run build` from `frontend`
- Frontend lint: `npm run lint` from `frontend`
- Backend syntax check: `python -m compileall backend\app` from repo root

## Data Model

- User: `id`, `name`, `email`, `password_hash`, `role`, `created_at`
- MenuItem: `id`, `name`, `description`, `category`, `price`,
  `is_vegetarian`, `is_spicy`, `available`, `is_special`, `cooking_method`,
  `embedding`, `deleted_at`, `created_at`, `updated_at`
- Order: `id`, `status`, `total_amount`, `created_at`, `updated_at`
- OrderItem: `id`, `order_id`, `menu_item_id`, `quantity`, `unit_price`

## Domain Decisions

- Customer checkout is guest checkout. There is no customer login requirement.
- Admin login uses JWT. Admin endpoints must use role-protected dependencies.
- No signup UI is exposed. `/api/auth/register` exists backend-side only.
- `is_vegetarian=false` is displayed as Non-Veg in the frontend.
- Menu removal is soft delete via `deleted_at`; do not hard-delete items.
- `OrderItem.unit_price` is snapshotted at order creation and must not be
  recalculated from current menu item prices.
- Today's Specials are controlled with `is_special`; backend limits specials to
  a small set in the special toggle route.

## Order Workflow

Forward only, one step at a time:

```text
placed -> confirmed -> preparing -> ready -> picked_up
```

Admins can advance status through `/api/admin/orders/{order_id}/status`.
Skipping steps or moving backward should return HTTP 400.

## AI Search

Endpoint: `POST /api/menu/search`

Search pipeline:

1. `app.services.query_parser.parse_query`
   - DeepSeek parser first when `DEEPSEEK_API_KEY` exists
   - Keyword fallback when the LLM is unavailable
2. Hard SQL filters in `app.routers.search`
   - `available == true`
   - `deleted_at IS NULL`
   - `price <= max_price`
   - `price >= min_price`
   - `is_vegetarian`
   - `is_spicy`
   - `cooking_method` include/exclude
   - optional `category_hint`
3. Cascade relaxation if zero results
   - category
   - cooking method
   - price
   - veg/spicy
   - full available menu fallback
4. `app.services.llm_rank.rank_candidates`
   - ranks up to 30 candidates
   - returns top results above score threshold
   - falls back to unranked filtered results if LLM ranking fails

Parser fields:

- `max_price`
- `min_price`
- `is_vegetarian`
- `is_spicy`
- `cooking_method_include`
- `cooking_method_exclude`
- `category_hint`
- `semantic_description`

Examples that should parse:

- `veg above 200`
- `spicy vegetarian starter under 200`
- `a light lunch not fried`
- `something sweet`
- `hot beverage`

After changing search/parser code, restart the backend server.

## API Surface

Auth:

- `POST /api/auth/register` - backend-only customer registration
- `POST /api/auth/login`
- `GET /api/auth/me`

Customer menu:

- `GET /api/menu`
- `GET /api/menu/categories`
- `GET /api/menu/specials`
- `GET /api/menu/{item_id}`
- `POST /api/menu/search`

Admin menu:

- `GET /api/admin/menu-items`
- `POST /api/admin/menu-items`
- `GET /api/admin/menu-items/{item_id}`
- `PUT /api/admin/menu-items/{item_id}`
- `PATCH /api/admin/menu-items/{item_id}/availability`
- `PATCH /api/admin/menu-items/{item_id}/special`
- `DELETE /api/admin/menu-items/{item_id}`

Orders:

- `POST /api/orders`
- `GET /api/orders/{order_id}`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/{order_id}/status`

Dashboard:

- `GET /api/admin/dashboard`

Health:

- `GET /api/health`

## Frontend Notes

- `AuthContext` stores `admin_token` and `apiClient` attaches it as a bearer
  token.
- `CartContext` owns cart quantities and total calculation.
- `ToastContext` is used for user feedback.
- `MenuBrowser` includes category browsing and today's specials.
- `AISearchBar` calls `/api/menu/search`.
- `ChatBot` is a customer-facing floating search assistant.
- `MenuManagement` handles admin CRUD, availability, and special toggles.
- Prices from the API may be strings because they are decimals; parse before
  calling `toFixed`.

## Style Notes

- Brand: Varad's Kitchen.
- Palette: warm stone background, chili red accent, deep warm text.
- Keep admin screens denser and more operational than customer screens.
- Avoid broad refactors when making integration fixes.

## Verification

Run after meaningful frontend changes:

```bash
cd frontend
npm run build
npm run lint
```

Run after backend route/model/parser changes:

```bash
python -m compileall backend\app
```
