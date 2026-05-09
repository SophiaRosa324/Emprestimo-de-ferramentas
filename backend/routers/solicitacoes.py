from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

import models
from database import get_db
from routers.auth import get_usuario_atual

router = APIRouter(prefix="/solicitacoes", tags=["Solicitações"])

SETORES_SEM_EMPRESTIMO_DIRETO = {"limpeza"}


# ── Schemas ────────────────────────────────────────────────
class SolicitacaoCreate(BaseModel):
    tipo: str           # ferramenta | compra
    item_nome: str
    descricao: Optional[str] = None

class SolicitacaoStatusUpdate(BaseModel):
    status: str         # aprovado | recusado | concluido

class SolicitacaoOut(BaseModel):
    id: int
    usuario_id: int
    setor: str
    tipo: str
    item_nome: str
    descricao: Optional[str]
    status: str
    criado_em: datetime
    atualizado_em: datetime
    usuario_nome: Optional[str] = None

    class Config:
        from_attributes = True


# ── Helper: bloquear empréstimo direto por setor ───────────
def verificar_permissao_emprestimo(usuario: models.Usuario):
    """Chame esta função no router de empréstimos para bloquear setores restritos."""
    setor = (usuario.setor or "").lower()
    if setor in SETORES_SEM_EMPRESTIMO_DIRETO:
        raise HTTPException(
            status_code=403,
            detail=f"Setor '{usuario.setor}' não pode criar empréstimos diretamente. Use uma solicitação."
        )


# ── Rotas ──────────────────────────────────────────────────
@router.post("/", status_code=201)
def criar_solicitacao(
    dados: SolicitacaoCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_usuario_atual),
):
    if not str(usuario.setor):
        raise HTTPException(status_code=400, detail="Seu usuário não possui setor definido. Contate o administrador.")
    if dados.tipo not in ("ferramenta", "compra"):
        raise HTTPException(status_code=400, detail="Tipo deve ser 'ferramenta' ou 'compra'.")

    sol = models.Solicitacao(
        usuario_id=usuario.id,
        setor=usuario.setor,
        tipo=dados.tipo,
        item_nome=dados.item_nome,
        descricao=dados.descricao,
    )
    db.add(sol)
    db.commit()
    db.refresh(sol)
    return {**sol.__dict__, "usuario_nome": usuario.nome}


@router.get("/")
def listar_solicitacoes(
    setor: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    apenas_minhas: bool = Query(False),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_usuario_atual),
):
    q = db.query(models.Solicitacao)

    # Operador comum só vê as próprias; admin/encarregado vê tudo
    if str(usuario.perfil) == "operador" or apenas_minhas:
        q = q.filter(models.Solicitacao.usuario_id == usuario.id)

    if setor:
        q = q.filter(models.Solicitacao.setor == setor)
    if status:
        q = q.filter(models.Solicitacao.status == status)

    solicitacoes = q.order_by(models.Solicitacao.criado_em.desc()).all()

    resultado = []
    for s in solicitacoes:
        resultado.append({
            "id": s.id,
            "usuario_id": s.usuario_id,
            "usuario_nome": s.usuario.nome if s.usuario else "",
            "setor": s.setor,
            "tipo": s.tipo,
            "item_nome": s.item_nome,
            "descricao": s.descricao,
            "status": s.status,
            "criado_em": s.criado_em,
            "atualizado_em": s.atualizado_em,
        })
    return resultado


@router.put("/{id}")
def atualizar_status(
    id: int,
    dados: SolicitacaoStatusUpdate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_usuario_atual),
):
    if str(usuario.perfil) not in ("admin", "encarregado"):
        raise HTTPException(status_code=403, detail="Apenas admin ou encarregado pode alterar status.")
    if dados.status not in ("aprovado", "recusado", "concluido"):
        raise HTTPException(status_code=400, detail="Status inválido.")

    sol = db.query(models.Solicitacao).filter(models.Solicitacao.id == id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")

    sol.status = dados.status  # type: ignore
    db.commit()
    db.refresh(sol)
    return sol