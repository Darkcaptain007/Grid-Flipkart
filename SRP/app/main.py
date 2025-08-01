# app/main.py
from fastapi import FastAPI
from .api.routers import router as api_router


app = FastAPI(title="Flipkart Search Service")

app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Flipkart Search API"}