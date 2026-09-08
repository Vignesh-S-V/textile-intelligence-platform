from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.yarns import router as yarns_router
from app.api.market_prices import router as market_prices_router
from app.api.yarn_ingestion import router as yarn_ingestion_router
from app.api.filter_metadata import router as filter_metadata_router

app = FastAPI(
    title="Textile Intelligence Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(yarns_router)
app.include_router(market_prices_router)
app.include_router(yarn_ingestion_router)
app.include_router(filter_metadata_router)


@app.get("/")
def root():
    return {"status": "online", "message": "Textile Intelligence Platform API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
