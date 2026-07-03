# Varad's Kitchen - Food Ordering System

A full-stack restaurant ordering app with a FastAPI backend and React frontend.
Customers can browse the menu, search in natural language, view item details,
manage a cart, place guest orders, and track order status. Admins can sign in,
manage menu items, monitor orders, advance order status, and view dashboard
metrics.

## Current Features

- Customer menu browsing at `/`
- Admin panel at `/admin`
- Admin JWT login
- Menu item CRUD with soft delete
- Menu availability toggle
- Today's Specials toggle and customer specials strip
- Cart with quantities and total calculation
- Guest order placement
- Order tracking by order ID
- Admin order list and status updates
- Dashboard with today's revenue, orders by status, and popular items
- AI-powered natural-language search
- Floating customer chat/search assistant

## Stack

- Backend: FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic, PostgreSQL
- Frontend: React, TypeScript, Vite, React Router, axios, Tailwind/CSS styling
- AI: DeepSeek via OpenAI-compatible client, with keyword fallback

## Routes

Frontend:

- `/` - Customer app
- `/customer` - Redirects to `/`
- `/admin` - Admin app

Backend:

- `/api/health`
- `/api/auth/*`
- `/api/menu/*`
- `/api/menu/search`
- `/api/orders/*`
- `/api/admin/menu-items/*`
- `/api/admin/orders/*`
- `/api/admin/dashboard`

## Setup

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Environment Variables

Backend `.env`:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=change-me

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin

DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:8000
```

`DEEPSEEK_API_KEY` is optional. If it is missing, search still works through the
keyword fallback parser, but ranking is less smart.

## Create Admin User

After migrations are applied:

```powershell
cd backend

$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="admin123"
$env:ADMIN_NAME="Admin"

python -m app.seed_admin
```

Then log in at `http://localhost:5173/admin`.

## Data Model

### User

- `id`
- `name`
- `email`
- `password_hash`
- `role`: `admin` or `customer`
- `created_at`

### MenuItem

- `id`
- `name`
- `description`
- `category`
- `price`
- `is_vegetarian`
- `is_spicy`
- `available`
- `is_special`
- `cooking_method`
- `embedding`
- `deleted_at`
- `created_at`
- `updated_at`

Dietary tags are stored as booleans. The frontend displays `Non-Veg` when
`is_vegetarian` is `false`.

### Order

- `id`
- `status`
- `total_amount`
- `created_at`
- `updated_at`

Orders are guest checkout. There is no customer ownership requirement.

### OrderItem

- `id`
- `order_id`
- `menu_item_id`
- `quantity`
- `unit_price`

`unit_price` is snapshotted when the order is placed, so later menu price edits
do not change historical order totals.

## API Overview

### Auth

| Method | Path                 | Auth | Notes                                                     |
| ------ | -------------------- | ---- | --------------------------------------------------------- |
| POST   | `/api/auth/register` | No   | Backend-only customer registration endpoint; no signup UI |
| POST   | `/api/auth/login`    | No   | Returns JWT access token                                  |
| GET    | `/api/auth/me`       | JWT  | Current user                                              |

### Customer Menu

| Method | Path                   | Auth | Notes                                     |
| ------ | ---------------------- | ---- | ----------------------------------------- |
| GET    | `/api/menu`            | No   | Available, non-deleted menu items         |
| GET    | `/api/menu/categories` | No   | Distinct available categories             |
| GET    | `/api/menu/specials`   | No   | Available items marked as today's special |
| GET    | `/api/menu/{item_id}`  | No   | Available item detail                     |

### Admin Menu

| Method | Path                                           | Auth  | Notes                                           |
| ------ | ---------------------------------------------- | ----- | ----------------------------------------------- |
| GET    | `/api/admin/menu-items`                        | Admin | List non-deleted menu items                     |
| POST   | `/api/admin/menu-items`                        | Admin | Create menu item                                |
| GET    | `/api/admin/menu-items/{item_id}`              | Admin | Single item, including unavailable/soft-deleted |
| PUT    | `/api/admin/menu-items/{item_id}`              | Admin | Update menu item                                |
| PATCH  | `/api/admin/menu-items/{item_id}/availability` | Admin | Toggle availability                             |
| PATCH  | `/api/admin/menu-items/{item_id}/special`      | Admin | Toggle today's special                          |
| DELETE | `/api/admin/menu-items/{item_id}`              | Admin | Soft delete                                     |

### Orders

| Method | Path                                  | Auth  | Notes                            |
| ------ | ------------------------------------- | ----- | -------------------------------- |
| POST   | `/api/orders`                         | No    | Place guest order                |
| GET    | `/api/orders/{order_id}`              | No    | Track order                      |
| GET    | `/api/admin/orders`                   | Admin | List orders, optional `?status=` |
| PATCH  | `/api/admin/orders/{order_id}/status` | Admin | Advance status one step          |

### Search

| Method | Path               | Auth | Notes                         |
| ------ | ------------------ | ---- | ----------------------------- |
| POST   | `/api/menu/search` | No   | Natural-language smart search |

Body:

```json
{
  "query": "veg above 200"
}
```

Search returns up to 15 available items, each with an optional relevance score.

### Dashboard

| Method | Path                   | Auth  | Notes                                            |
| ------ | ---------------------- | ----- | ------------------------------------------------ |
| GET    | `/api/admin/dashboard` | Admin | Today's revenue, orders by status, popular items |

## AI Search Behavior

The search endpoint uses a staged pipeline:

1. Parse the natural-language query.
   - DeepSeek is used first when `DEEPSEEK_API_KEY` is configured.
   - If unavailable, the regex/keyword parser is used.
2. Extract structured filters:
   - `max_price`
   - `min_price`
   - `is_vegetarian`
   - `is_spicy`
   - `cooking_method_include`
   - `cooking_method_exclude`
   - `category_hint`
   - `semantic_description`
3. Apply deterministic SQL filters.
   - Only `available = true` and `deleted_at IS NULL` items are considered.
   - Price supports both "under 200" and "above 200" style queries.
4. Relax filters if no exact matches are found.
5. Rank shortlisted candidates with DeepSeek.
   - If ranking is unavailable, the endpoint returns filtered candidates unranked.

Examples:

- `spicy vegetarian starter under 200`
- `veg above 200`
- `a light lunch not fried`
- `something sweet`
- `hot beverage`

## Order Workflow

Order status moves forward only:

```text
placed -> confirmed -> preparing -> ready -> picked_up
```

Admins can advance one step at a time. Skipping or moving backward returns
`400 Bad Request`.

## Admin Menu Import

There is no bulk-create endpoint. To add many items, log in once and loop over
`POST /api/admin/menu-items` with the admin bearer token.

## Verification Commands

```bash
# frontend
cd frontend
npm run build
npm run lint

# backend syntax smoke check
cd ..
python -m compileall backend\app
```
