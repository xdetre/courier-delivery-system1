from fastapi import FastAPI
from routers import routes
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(routes.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # или ["http://localhost:8081"] для конкретного домена
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Courier Tracking API"}