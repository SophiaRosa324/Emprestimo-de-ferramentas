from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, Base
import models  # noqa
from routers import tools, reports, categories
from routers.loans import router as loans_router
from routers.responsaveis import router as resp_router
from routers.auth import router as auth_router, get_usuario_atual, hash_senha

# Importa novos routers se existirem (expansão)
try:
    from routers.solicitacoes import router as sol_router
    from routers.reservas     import router as res_router
    from routers.dashboard    import router as dash_router
    _extras = True
except ImportError:
    _extras = False

Base.metadata.create_all(bind=engine)
os.makedirs("uploads", exist_ok=True)


def _seed_admin():
    from database import SessionLocal
    db = SessionLocal()
    try:
        if not db.query(models.Usuario).first():
            db.add(models.Usuario(
                nome="Administrador",
                email="admin@toolvault.com",
                senha_hash=hash_senha("admin123"),
                perfil="admin",
                setor="administracao",
                nivel_setor="administrador",
            ))
            db.commit()
            print("✅ Admin padrão: admin@toolvault.com / admin123")
    finally:
        db.close()

_seed_admin()

app = FastAPI(title="ToolVault API", version="2.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.include_router(auth_router)

_auth = [Depends(get_usuario_atual)]
app.include_router(tools.router,      dependencies=_auth)
app.include_router(loans_router,      dependencies=_auth)
app.include_router(resp_router,       dependencies=_auth)
app.include_router(reports.router,    dependencies=_auth)
app.include_router(categories.router, dependencies=_auth)

if _extras:
    app.include_router(sol_router,  dependencies=_auth)
    app.include_router(res_router,  dependencies=_auth)
    app.include_router(dash_router, dependencies=_auth)

@app.get("/")
def root():
    return {"mensagem": "ToolVault API v2.2 rodando!", "docs": "/docs"}