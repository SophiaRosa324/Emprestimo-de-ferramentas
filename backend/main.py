from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, Base
import models  # noqa
from routers.tools          import router as tools_router
from routers.igrejas        import router as igrejas_router
from routers.extintores     import router as extintores_router
from routers.reports        import router as reports_router
from routers.responsaveis   import router as resp_router

# Importa routers que podem existir de blocos anteriores
try:
    from routers.auth import router as auth_router, get_usuario_atual, hash_senha
    _auth_disponivel = True
except ImportError:
    _auth_disponivel = False

try:
    from routers.loans              import router as loans_router
    from routers.categories         import router as categories_router
    from routers.manutencao         import router as manut_router
    from routers.empresas_manutencao import router as empresas_router
    _extras = True
except ImportError:
    _extras = False

Base.metadata.create_all(bind=engine)
os.makedirs("uploads", exist_ok=True)

if _auth_disponivel:
    def _seed_admin():
        from database import SessionLocal
        db = SessionLocal()
        try:
            if not db.query(models.Usuario).first():
                db.add(models.Usuario(
                    nome="Administrador", email="admin@toolvault.com",
                    senha_hash=hash_senha("admin123"), perfil="admin",
                    setor="administracao", nivel_setor="administrador",
                ))
                db.commit()
        finally:
            db.close()
    _seed_admin()

app = FastAPI(title="ToolVault API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://emprestimo-de-ferramentas-9si297xfg-sophiarosa324s-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Auth (opcional)
if _auth_disponivel:
    app.include_router(auth_router)
    _auth = [Depends(get_usuario_atual)]
else:
    _auth = []

# Routers principais
app.include_router(tools_router,      dependencies=_auth)
app.include_router(igrejas_router,    dependencies=_auth)
app.include_router(extintores_router, dependencies=_auth)
app.include_router(reports_router,    dependencies=_auth)
app.include_router(resp_router,       dependencies=_auth)

if _extras:
    app.include_router(loans_router,      dependencies=_auth)
    app.include_router(categories_router, dependencies=_auth)
    app.include_router(manut_router,      dependencies=_auth)
    app.include_router(empresas_router,   dependencies=_auth)

@app.get("/")
def root():
    return {"mensagem": "ToolVault API v3 rodando!", "docs": "/docs"}