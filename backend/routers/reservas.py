from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

import models
from database import get_db
from routers.auth import get_usuario_atual

router = APIRouter(prefix="/reservas", tags=["Reservas"])


# ── Schemas ────────────────────────────────────────────────
class ReservaCreate(BaseModel):
    ferramenta_id: int
    data_inicio: datetime
    data_fim: datetime

class ReservaOut(BaseModel):
    id: int
    ferramenta_id: int
    usuario_id: int
    data_inicio: datetime
    data_fim: datetime
    status: str
    criado_em: datetime
    ferramenta_nome: Optional[str] = None
    usuario_nome: Optional[str] = None

    class Config:
        from_attributes = True


# ── Helper: verificar conflito de datas ───────────────────
def _tem_conflito(db: Session, ferramenta_id: int, inicio: datetime, fim: datetime, excluir_id: Optional[int] = None) -> bool:
    q = db.query(models.Reserva).filter(
        models.Reserva.ferramenta_id == ferramenta_id,
        models.Reserva.status == "ativa",
        or_(
            and_(models.Reserva.data_inicio <= inicio, models.Reserva.data_fim >= inicio),
            and_(models.Reserva.data_inicio <= fim,    models.Reserva.data_fim >= fim),
            and_(models.Reserva.data_inicio >= inicio, models.Reserva.data_fim <= fim),
        )
    )
    if excluir_id:
        q = q.filter(models.Reserva.id != excluir_id)
    return q.first() is not None


# ── Rotas ──────────────────────────────────────────────────
@router.post("/", status_code=201)
def criar_reserva(
    dados: ReservaCreate,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_usuario_atual),
):
    if dados.data_inicio >= dados.data_fim:
        raise HTTPException(status_code=400, detail="Data de início deve ser anterior à data de fim.")
    if dados.data_inicio < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Data de início não pode ser no passado.")

    ferramenta = db.query(models.Ferramenta).filter(models.Ferramenta.id == dados.ferramenta_id).first()
    if not ferramenta:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada.")

    if _tem_conflito(db, dados.ferramenta_id, dados.data_inicio, dados.data_fim):
        raise HTTPException(status_code=409, detail="Já existe uma reserva ativa para este período.")

    reserva = models.Reserva(
        ferramenta_id=dados.ferramenta_id,
        usuario_id=usuario.id,
        data_inicio=dados.data_inicio,
        data_fim=dados.data_fim,
    )
    db.add(reserva)
    db.commit()
    db.refresh(reserva)
    return {
        **reserva.__dict__,
        "ferramenta_nome": ferramenta.nome,
        "usuario_nome": usuario.nome,
    }


@router.get("/")
def listar_reservas(
    ferramenta_id: Optional[int] = Query(None),
    apenas_minhas: bool = Query(False),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_usuario_atual),
):
    q = db.query(models.Reserva)

    if apenas_minhas or str(usuario.perfil) == "operador":
        q = q.filter(models.Reserva.usuario_id == usuario.id)
    if ferramenta_id:
        q = q.filter(models.Reserva.ferramenta_id == ferramenta_id)
    if status:
        q = q.filter(models.Reserva.status == status)

    reservas = q.order_by(models.Reserva.data_inicio).all()

    return [
        {
            "id": r.id,
            "ferramenta_id": r.ferramenta_id,
            "ferramenta_nome": r.ferramenta.nome if r.ferramenta else "",
            "usuario_id": r.usuario_id,
            "usuario_nome": r.usuario.nome if r.usuario else "",
            "data_inicio": r.data_inicio,
            "data_fim": r.data_fim,
            "status": r.status,
            "criado_em": r.criado_em,
        }
        for r in reservas
    ]


@router.delete("/{id}", status_code=204)
def cancelar_reserva(
    id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_usuario_atual),
):
    reserva = db.query(models.Reserva).filter(models.Reserva.id == id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva não encontrada.")
    if  reserva.usuario_id != usuario.id and str(usuario.perfil) != "admin": # type: ignore
        raise HTTPException(status_code=403, detail="Sem permissão para cancelar esta reserva.")
    if  str(reserva.status) != "ativa":
        raise HTTPException(status_code=400, detail="Apenas reservas ativas podem ser canceladas.")

    reserva.status = "cancelada" # type: ignore
    db.commit()