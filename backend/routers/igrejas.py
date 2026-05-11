from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta

import models
import schemas
from database import get_db

router = APIRouter(prefix="/igrejas", tags=["Igrejas"])


# ── Helpers ────────────────────────────────────────────────
def _ext_stats(extintores):
    hoje = date.today()
    s = {"vencidos": 0, "vence_30d": 0, "ok": 0, "sem_validade": 0}
    for e in extintores:
        if not e.data_validade:
            s["sem_validade"] += 1
        elif e.data_validade < hoje:
            s["vencidos"] += 1
        elif e.data_validade <= hoje + timedelta(days=30):
            s["vence_30d"] += 1
        else:
            s["ok"] += 1
    return s


# ── Rotas ──────────────────────────────────────────────────
@router.get("/", response_model=List[schemas.IgrejaOut])
def listar_igrejas(
    busca: Optional[str]  = Query(None),
    ativo: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Igreja)
    if busca is not None:
        q = q.filter(models.Igreja.nome.ilike(f"%{busca}%"))
    if ativo is not None:
        q = q.filter(models.Igreja.ativo == ativo)
    return q.order_by(models.Igreja.nome).all()


@router.get("/stats/resumo")
def stats_igrejas(db: Session = Depends(get_db)):
    igrejas = db.query(models.Igreja).filter(models.Igreja.ativo == True).all()
    resultado = []
    for ig in igrejas:
        ferramentas = db.query(models.Ferramenta).filter(models.Ferramenta.igreja_id == ig.id).all()
        extintores  = db.query(models.Extintor).filter(
            models.Extintor.igreja_id == ig.id, models.Extintor.ativo == True
        ).all()
        por_estado = {}
        for f in ferramentas:
            por_estado[f.estado] = por_estado.get(f.estado, 0) + 1
        resultado.append({
            "id":                  ig.id,
            "nome":                ig.nome,
            "total_ferramentas":   len(ferramentas),
            "ferramentas_estado":  por_estado,
            "total_extintores":    len(extintores),
            "extintores_stats":    _ext_stats(extintores),
        })
    return resultado


@router.get("/{id}", response_model=schemas.IgrejaOut)
def obter_igreja(id: int, db: Session = Depends(get_db)):
    ig = db.query(models.Igreja).filter(models.Igreja.id == id).first()
    if not ig:
        raise HTTPException(status_code=404, detail="Igreja não encontrada.")
    return ig


@router.get("/{id}/detalhes")
def detalhes_igreja(id: int, db: Session = Depends(get_db)):
    ig = db.query(models.Igreja).filter(models.Igreja.id == id).first()
    if not ig:
        raise HTTPException(status_code=404, detail="Igreja não encontrada.")

    ferramentas = db.query(models.Ferramenta).filter(models.Ferramenta.igreja_id == id).all()
    extintores  = db.query(models.Extintor).filter(
        models.Extintor.igreja_id == id, models.Extintor.ativo == True
    ).all()
    por_estado = {}
    for f in ferramentas:
        por_estado[f.estado] = por_estado.get(f.estado, 0) + 1

    return {
        "id":          ig.id,
        "nome":        ig.nome,
        "endereco":    ig.endereco,
        "responsavel": ig.responsavel,
        "telefone":    ig.telefone,
        "ativo":       ig.ativo,
        "criado_em":   ig.criado_em.isoformat(),
        "total_ferramentas":     len(ferramentas),
        "ferramentas_por_estado":por_estado,
        "total_extintores":      len(extintores),
        "extintores_stats":      _ext_stats(extintores),
        "ferramentas": [
            {
                "id":        f.id,
                "nome":      f.nome,
                "estado":    f.estado,
                "categoria": f.categoria.nome if f.categoria else None,
                "localizacao": f.localizacao,
            }
            for f in ferramentas
        ],
    }


@router.post("/", response_model=schemas.IgrejaOut, status_code=201)
def criar_igreja(dados: schemas.IgrejaCreate, db: Session = Depends(get_db)):
    dup = db.query(models.Igreja).filter(
        func.lower(models.Igreja.nome) == dados.nome.strip().lower()
    ).first()
    if dup:
        raise HTTPException(status_code=400, detail=f"Igreja '{dados.nome}' já cadastrada.")
    ig = models.Igreja(**dados.model_dump())
    ig.nome = dados.nome.strip()
    db.add(ig)
    db.commit()
    db.refresh(ig)
    return ig


@router.put("/{id}", response_model=schemas.IgrejaOut)
def atualizar_igreja(id: int, dados: schemas.IgrejaUpdate, db: Session = Depends(get_db)):
    ig = db.query(models.Igreja).filter(models.Igreja.id == id).first()
    if not ig:
        raise HTTPException(status_code=404, detail="Igreja não encontrada.")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(ig, campo, valor)
    db.commit()
    db.refresh(ig)
    return ig


@router.delete("/{id}", status_code=204)
def deletar_igreja(id: int, db: Session = Depends(get_db)):
    ig = db.query(models.Igreja).filter(models.Igreja.id == id).first()
    if not ig:
        raise HTTPException(status_code=404, detail="Igreja não encontrada.")
    nf = db.query(func.count(models.Ferramenta.id)).filter(models.Ferramenta.igreja_id == id).scalar()
    ne = db.query(func.count(models.Extintor.id)).filter(models.Extintor.igreja_id == id).scalar()
    if (nf or 0) + (ne or 0) > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Igreja possui {nf} ferramenta(s) e {ne} extintor(es). Reatribua-os antes."
        )
    db.delete(ig)
    db.commit()