from fastapi import FastAPI

app = FastAPI(
    title="Textile Intelligence Platform",
    version="1.0.0"
)


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
