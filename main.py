from fastapi import FastAPI
from routers import routes, tracking, auth, order
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


app = FastAPI(
    title="Courier Delivery API",
    docs_url="/docs",
    redoc_url="/redoc",
)

origins = [
    "http://localhost:8001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # origins или ["http://localhost:8001"] для конкретного домена
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(routes.router)
app.include_router(tracking.router)
app.include_router(auth.router)
app.include_router(order.router)

# # Роут для админки
# app.mount("/admin", StaticFiles(directory="static/admin", html=True), name="admin")
# # Роут для курьера
# app.mount("/courier", StaticFiles(directory="static/courier", html=True), name="courier")


@app.get("/")
def root():
    return {"message": "Courier Tracking API"}