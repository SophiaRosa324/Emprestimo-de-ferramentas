from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

import models
import schemas
from database import get_db

router = APIRouter(prefix="/responsaveis", tags=["Responsáveis"])


def _fmt(d):
    return d.isoformat() if d else None


@router.get("/", response_model=List[schemas.ResponsavelOut])
def listar_responsaveis(
    busca: Optional[str] = Query(None),
    setor: Optional[str] = Query(None),
    ativo: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Responsavel)
    if busca: q = q.filter(models.Responsavel.nome.ilike(f"%{busca}%"))
    if setor: q = q.filter(models.Responsavel.setor == setor)
    if ativo is not None: q = q.filter(models.Responsavel.ativo == ativo)
    return q.order_by(models.Responsavel.nome).all()


@router.post("/", response_model=schemas.ResponsavelOut, status_code=201)
def criar_responsavel(dados: schemas.ResponsavelCreate, db: Session = Depends(get_db)):
    r = models.Responsavel(**dados.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.put("/{id}", response_model=schemas.ResponsavelOut)
def atualizar_responsavel(id: int, dados: schemas.ResponsavelUpdate, db: Session = Depends(get_db)):
    r = db.query(models.Responsavel).filter(models.Responsavel.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Responsável não encontrado.")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(r, campo, valor)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{id}", status_code=204)
def deletar_responsavel(id: int, db: Session = Depends(get_db)):
    r = db.query(models.Responsavel).filter(models.Responsavel.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Responsável não encontrado.")
    db.delete(r)
    db.commit()


# ── Detalhes completos ─────────────────────────────────────
@router.get("/{id}/detalhes")
def detalhes_responsavel(id: int, db: Session = Depends(get_db)):
    r = db.query(models.Responsavel).filter(models.Responsavel.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Responsável não encontrado.")

    hoje = datetime.utcnow()

    emprestimos = (
        db.query(models.Emprestimo)
        .filter(models.Emprestimo.responsavel_id == id)
        .order_by(models.Emprestimo.data_saida.desc())
        .all()
    )

    ativos    = [e for e in emprestimos if not e.devolvida]
    historico = [e for e in emprestimos if e.devolvida]
    atrasados = [
        e for e in ativos
        if e.data_retorno_prevista and e.data_retorno_prevista < hoje
    ]

    def _emp(e):
        atrasado = (not e.devolvida and e.data_retorno_prevista and e.data_retorno_prevista < hoje)
        dias_atraso = (hoje - e.data_retorno_prevista).days if atrasado and e.data_retorno_prevista else 0
        return {
            "id": e.id,
            "ferramenta_id":    e.ferramenta_id,
            "ferramenta_nome":  e.ferramenta.nome   if e.ferramenta else "",
            "ferramenta_codigo":e.ferramenta.codigo if e.ferramenta else "",
            "data_saida":             _fmt(e.data_saida),
            "data_retorno_prevista":  _fmt(e.data_retorno_prevista),
            "data_retorno_real":      _fmt(e.data_retorno_real),
            "devolvida":   e.devolvida,
            "atrasado":    atrasado,
            "dias_atraso": dias_atraso,
            "observacoes": e.observacoes,
        }

    return {
        # Dados do responsável
        "id":        r.id,
        "nome":      r.nome,
        "contato":   r.contato,
        "setor":     r.setor,
        "cargo":     r.cargo,
        "ativo":     r.ativo,
        "criado_em": _fmt(r.criado_em),

        # Resumo
        "total_emprestimos":   len(emprestimos),
        "emprestimos_ativos":  len(ativos),
        "emprestimos_historico": len(historico),
        "total_atrasados":     len(atrasados),

        # Listas
        "ativos":    [_emp(e) for e in ativos],
        "historico": [_emp(e) for e in historico[:20]],   # últimos 20
        "atrasados": [_emp(e) for e in atrasados],
    }