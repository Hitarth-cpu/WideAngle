import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from backend.core.database import init_db
    await init_db()
    yield


app = FastAPI(title="WideAngle", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


from backend.api import sessions as sessions_router
from backend.api import chat as chat_router
from backend.api import ws as ws_api

app.include_router(sessions_router.router, prefix="/api")
app.include_router(chat_router.router, prefix="/api")
app.include_router(ws_api.router)
