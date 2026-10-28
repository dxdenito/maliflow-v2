from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes import (
    accounts,
    alerts,
    auth,
    budgets,
    categories,
    expenses,
    income,
    investments,
    ledger,
    networth,
    obligations,
    purchases,
    reports,
    savings,
)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(income.router)
app.include_router(categories.router)
app.include_router(expenses.router)
app.include_router(budgets.router)
app.include_router(savings.router)
app.include_router(obligations.router)
app.include_router(purchases.router)
app.include_router(investments.router)
app.include_router(ledger.router)
app.include_router(networth.router)
app.include_router(reports.router)
app.include_router(alerts.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name}