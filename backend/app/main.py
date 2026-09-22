from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import router
from dotenv import load_dotenv

# Load env variables before starting app
load_dotenv()

app = FastAPI(title="Hasamex AI Research API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local prototyping
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
