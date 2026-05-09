from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

import models
from database import get_db

SECRET_KEY = "toolVault-secret-2025-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
router = APIRouter(prefix="/auth", tags=["Autenticação"])


# ── Schemas ─────────────────────────────────────────────────
class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str
    perfil: Optional[str] = "operador"
    setor: Optional[str] = None
    nivel_setor: Optional[str] = "membro"

class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: str
    perfil: str
    setor: Optional[str] = None
    nivel_setor: Optional[str] = "membro"
    ativo: bool
    criado_em: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioOut

class SenhaUpdate(BaseModel):
    senha_atual: str
    nova_senha: str

class UsuarioUpdate(BaseModel):
    setor: Optional[str] = None
    perfil: Optional[str] = None
    nivel_setor: Optional[str] = None


# ── Helpers ─────────────────────────────────────────────────
def hash_senha(senha: str) -> str:
    return pwd_ctx.hash(senha)

def verificar_senha(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def criar_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_usuario_atual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.Usuario:
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado.", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise exc
    except JWTError:
        raise exc
    u = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not u or not u.ativo:
        raise exc
    return u

def require_admin(u: models.Usuario = Depends(get_usuario_atual)):
    if u.perfil != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    return u

def require_admin_ou_encarregado(u: models.Usuario = Depends(get_usuario_atual)):
    if u.perfil not in ("admin", "encarregado") and u.nivel_setor not in ("encarregado", "administrador"):
        raise HTTPException(status_code=403, detail="Acesso restrito a admin ou encarregado.")
    return u

def pode_aprovar_setor(usuario: models.Usuario, setor: str) -> bool:
    """Verifica se um usuário pode aprovar solicitações de um setor."""
    if usuario.perfil == "admin":
        return True
    if usuario.nivel_setor in ("encarregado", "administrador") and usuario.setor == setor:
        return True
    return False


# ── Rotas ───────────────────────────────────────────────────
@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(models.Usuario).filter(models.Usuario.email == form.username).first()
    if not u or not verificar_senha(form.password, u.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    if not u.ativo:
        raise HTTPException(status_code=403, detail="Conta desativada.")
    token = criar_token({"sub": u.email})
    return {"access_token": token, "token_type": "bearer", "usuario": u}

@router.post("/registrar", response_model=UsuarioOut, status_code=201)
def registrar(dados: UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.email == dados.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado.")
    u = models.Usuario(
        nome=dados.nome, email=dados.email,
        senha_hash=hash_senha(dados.senha),
        perfil=dados.perfil, setor=dados.setor,
        nivel_setor=dados.nivel_setor or "membro",
    )
    db.add(u); db.commit(); db.refresh(u)
    return u

@router.get("/me", response_model=UsuarioOut)
def me(u: models.Usuario = Depends(get_usuario_atual)):
    return u

@router.patch("/senha")
def alterar_senha(dados: SenhaUpdate, u: models.Usuario = Depends(get_usuario_atual), db: Session = Depends(get_db)):
    if not verificar_senha(dados.senha_atual, u.senha_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta.")
    u.senha_hash = hash_senha(dados.nova_senha)
    db.commit()
    return {"mensagem": "Senha alterada com sucesso."}

@router.get("/usuarios", response_model=list[UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(models.Usuario).order_by(models.Usuario.nome).all()

@router.get("/usuarios/{id}/detalhes")
def detalhes_usuario(id: int, db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    u = db.query(models.Usuario).filter(models.Usuario.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    hoje = datetime.utcnow()

    # Busca empréstimos pelo nome do responsável (join por nome)
    responsavel = db.query(models.Responsavel).filter(models.Responsavel.nome == u.nome).first()
    emprestimos = []
    atrasados = 0
    if responsavel:
        emp_list = db.query(models.Emprestimo).filter(
            models.Emprestimo.responsavel_id == responsavel.id
        ).order_by(models.Emprestimo.data_saida.desc()).limit(10).all()
        for e in emp_list:
            atrasado = (not e.devolvida and e.data_retorno_prevista and e.data_retorno_prevista < hoje)
            if atrasado:
                atrasados += 1
            emprestimos.append({
                "id": e.id,
                "ferramenta": e.ferramenta.nome if e.ferramenta else "",
                "data_saida": e.data_saida,
                "data_retorno_prevista": e.data_retorno_prevista,
                "devolvida": e.devolvida,
                "atrasado": atrasado,
            })

    # Solicitações
    solic = db.query(models.Solicitacao).filter(
        models.Solicitacao.usuario_id == id
    ).order_by(models.Solicitacao.criado_em.desc()).limit(10).all()

    # Reservas ativas
    reservas = db.query(models.Reserva).filter(
        models.Reserva.usuario_id == id,
        models.Reserva.status == "ativa",
    ).all()

    return {
        "id": u.id,
        "nome": u.nome,
        "email": u.email,
        "perfil": u.perfil,
        "setor": u.setor,
        "nivel_setor": u.nivel_setor,
        "ativo": u.ativo,
        "criado_em": u.criado_em,
        "emprestimos": emprestimos,
        "ferramentas_atrasadas": atrasados,
        "solicitacoes": [
            {"id": s.id, "item_nome": s.item_nome, "tipo": s.tipo, "status": s.status, "criado_em": s.criado_em}
            for s in solic
        ],
        "reservas_ativas": [
            {"id": r.id, "ferramenta": r.ferramenta.nome if r.ferramenta else "", "data_inicio": r.data_inicio, "data_fim": r.data_fim}
            for r in reservas
        ],
    }

@router.patch("/usuarios/{id}", response_model=UsuarioOut)
def atualizar_usuario(id: int, dados: UsuarioUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    u = db.query(models.Usuario).filter(models.Usuario.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if dados.setor is not None:       u.setor = dados.setor
    if dados.perfil is not None:      u.perfil = dados.perfil
    if dados.nivel_setor is not None: u.nivel_setor = dados.nivel_setor
    db.commit(); db.refresh(u)
    return u

@router.patch("/usuarios/{id}/ativo")
def toggle_ativo(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    u = db.query(models.Usuario).filter(models.Usuario.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    u.ativo = not u.ativo
    db.commit()
    return {"id": u.id, "ativo": u.ativo}

@router.delete("/usuarios/{id}", status_code=204)
def deletar_usuario(id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    if id == admin.id:
        raise HTTPException(status_code=400, detail="Não é possível excluir a própria conta.")
    u = db.query(models.Usuario).filter(models.Usuario.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    db.delete(u); db.commit()