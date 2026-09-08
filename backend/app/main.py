from fastapi import FastAPI

from app.api.yarns import router as yarns_router
from app.api.market_prices import router as market_prices_router

app = FastAPI(
    title="Textile Intelligence Platform",
    version="1.0.0"
)

app.include_router(yarns_router)
app.include_router(market_prices_router)


@app.get("/")
def root():
    return {
        "status": "online",
        "message": "Textile Intelligence Platform API"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
