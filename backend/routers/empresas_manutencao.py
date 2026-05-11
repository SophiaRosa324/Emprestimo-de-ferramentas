from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

import models
from database import get_db
from routers.auth import get_usuario_atual

router = APIRouter(prefix="/empresas-manutencao", tags=["Empresas de Manutenção"])


# ── Schemas ────────────────────────────────────────────────
class EmpresaCreate(BaseModel):
    nome:         str
    telefone:     Optional[str] = None
    email:        Optional[str] = None
    endereco:     Optional[str] = None
    tipo_servico: Optional[str] = None
    observacoes:  Optional[str] = None

class EmpresaUpdate(EmpresaCreate):
    nome: Optional[str] = None
    ativa: Optional[bool] = None


def _serializar(e: models.EmpresaManutencao, total_servicos: int = 0) -> dict:
    return {
        "id":           e.id,
        "nome":         e.nome,
        "telefone":     e.telefone,
        "email":        e.email,
        "endereco":     e.endereco,
        "tipo_servico": e.tipo_servico,
        "observacoes":  e.observacoes,
        "ativa":        e.ativa,
        "criado_em":    e.criado_em.isoformat(),
        "total_servicos": total_servicos,
    }


# ── Rotas ──────────────────────────────────────────────────
@router.get("/")
def listar_empresas(
    busca: Optional[str]  = Query(None),
    ativa: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_usuario_atual),
):
    q = db.query(models.EmpresaManutencao)
    if busca: q = q.filter(models.EmpresaManutencao.nome.ilike(f"%{busca}%"))
    if ativa is not None: q = q.filter(models.EmpresaManutencao.ativa == ativa)
    empresas = q.order_by(models.EmpresaManutencao.nome).all()

    # Conta serviços por empresa em uma única query
    contagem = dict(
        db.query(models.Manutencao.empresa_id, func.count(models.Manutencao.id))
        .group_by(models.Manutencao.empresa_id)
        .all()
    )
    return [_serializar(e, contagem.get(e.id, 0)) for e in empresas]


@router.get("/{id}")
def obter_empresa(id: int, db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    e = db.query(models.EmpresaManutencao).filter(models.EmpresaManutencao.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    total = db.query(func.count(models.Manutencao.id)).filter(models.Manutencao.empresa_id == id).scalar()
    custo = db.query(func.sum(models.Manutencao.valor)).filter(models.Manutencao.empresa_id == id).scalar() or 0

    manutencoes_recentes = (
        db.query(models.Manutencao)
        .filter(models.Manutencao.empresa_id == id)
        .order_by(models.Manutencao.criado_em.desc())
        .limit(10)
        .all()
    )

    resultado = _serializar(e, total)
    resultado["custo_total"]        = round(custo, 2)
    resultado["manutencoes_recentes"] = [
        {
            "id":               m.id,
            "ferramenta_nome":  m.ferramenta.nome   if m.ferramenta else "",
            "ferramenta_codigo":m.ferramenta.codigo if m.ferramenta else "",
            "problema":         m.problema,
            "status":           m.status,
            "valor":            m.valor,
            "criado_em":        m.criado_em.isoformat(),
        }
        for m in manutencoes_recentes
    ]
    return resultado


@router.post("/", status_code=201)
def criar_empresa(dados: EmpresaCreate, db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    e = models.EmpresaManutencao(**dados.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return _serializar(e)


@router.put("/{id}")
def atualizar_empresa(id: int, dados: EmpresaUpdate, db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    e = db.query(models.EmpresaManutencao).filter(models.EmpresaManutencao.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(e, campo, valor)
    db.commit()
    db.refresh(e)
    return _serializar(e)


@router.delete("/{id}", status_code=204)
def deletar_empresa(id: int, db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    e = db.query(models.EmpresaManutencao).filter(models.EmpresaManutencao.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    em_uso = db.query(func.count(models.Manutencao.id)).filter(
        models.Manutencao.empresa_id == id,
        models.Manutencao.status.in_(["aguardando_envio", "em_manutencao"])
    ).scalar()
    if em_uso > 0:
        raise HTTPException(status_code=400, detail=f"Empresa possui {em_uso} serviço(s) em andamento.")
    db.delete(e)
    db.commit()