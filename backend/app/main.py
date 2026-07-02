from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, customer_menu, dashboard, menu, orders, search

app = FastAPI(title="Food Ordering System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(customer_menu.router)
app.include_router(menu.router, prefix="/api/admin/menu-items", tags=["admin"])
app.include_router(orders.router)
app.include_router(orders.admin_router)
app.include_router(search.router)
app.include_router(dashboard.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
