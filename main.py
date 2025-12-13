from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from routers import routes, tracking, auth, order
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


app = FastAPI(
    title="Courier Delivery API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Обработчик ошибок валидации
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    error_messages = []
    for error in errors:
        field = " -> ".join(str(loc) for loc in error.get("loc", []))
        message = error.get("msg", "Ошибка валидации")
        error_messages.append(f"{field}: {message}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "; ".join(error_messages)}
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


# API роутеры с префиксом /api
app.include_router(routes.router, prefix="/api")
app.include_router(tracking.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(order.router, prefix="/api")

# # Роут для админки
# app.mount("/admin", StaticFiles(directory="static/admin", html=True), name="admin")
# # Роут для курьера (html=True автоматически обслуживает index.html)
# app.mount("/courier", StaticFiles(directory="static/courier", html=True), name="courier")


@app.get("/")
def root():
    return {"message": "Courier Tracking API"}