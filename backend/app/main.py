from fastapi import FastAPI

from app.api import yarns, raw_material, yarn_ingestion

app = FastAPI(
    title="Textile Intelligence Platform",
    version="1.0.0"
)

app.include_router(yarns.router)
app.include_router(raw_material.router)
app.include_router(yarn_ingestion.router)


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
