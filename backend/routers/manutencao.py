from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

import models
from database import get_db
from routers.auth import get_usuario_atual

router = APIRouter(prefix="/manutencao", tags=["Manutenção"])

# ── Estados válidos e transições permitidas ────────────────
ESTADOS = {
    "aguardando_envio": {"label": "Aguardando envio",  "proximos": ["em_manutencao", "cancelada"]},
    "em_manutencao":   {"label": "Em manutenção",      "proximos": ["concluida",     "cancelada"]},
    "concluida":       {"label": "Concluída",           "proximos": []},
    "cancelada":       {"label": "Cancelada",           "proximos": []},
}


# ── Schemas ────────────────────────────────────────────────
class ManutencaoCreate(BaseModel):
    ferramenta_id:    int
    empresa_id:       Optional[int]    = None
    problema:         str
    descricao_servico:Optional[str]    = None
    data_envio:       Optional[datetime] = None
    data_retorno_prev:Optional[datetime] = None
    valor:            Optional[float]  = None
    observacoes:      Optional[str]    = None

class ManutencaoUpdate(BaseModel):
    empresa_id:       Optional[int]    = None
    problema:         Optional[str]    = None
    descricao_servico:Optional[str]    = None
    data_envio:       Optional[datetime] = None
    data_retorno_prev:Optional[datetime] = None
    valor:            Optional[float]  = None
    observacoes:      Optional[str]    = None

class AvancarStatusInput(BaseModel):
    novo_status:      str
    descricao_servico:Optional[str]    = None
    valor:            Optional[float]  = None
    data_retorno_real:Optional[datetime] = None
    observacoes:      Optional[str]    = None


def _serializar(m: models.Manutencao) -> dict:
    return {
        "id":                  m.id,
        "ferramenta_id":       m.ferramenta_id,
        "ferramenta_nome":     m.ferramenta.nome   if m.ferramenta else "",
        "ferramenta_codigo":   m.ferramenta.codigo if m.ferramenta else "",
        "empresa_id":          m.empresa_id,
        "empresa_nome":        m.empresa.nome      if m.empresa    else None,
        "problema":            m.problema,
        "descricao_servico":   m.descricao_servico,
        "data_envio":          m.data_envio.isoformat()          if m.data_envio          else None,
        "data_retorno_prev":   m.data_retorno_prev.isoformat()   if m.data_retorno_prev   else None,
        "data_retorno_real":   m.data_retorno_real.isoformat()   if m.data_retorno_real   else None,
        "valor":               m.valor,
        "status":              m.status,
        "status_label":        ESTADOS.get(m.status, {}).get("label", m.status),
        "proximos_status":     ESTADOS.get(m.status, {}).get("proximos", []),
        "observacoes":         m.observacoes,
        "criado_em":           m.criado_em.isoformat(),
        "atualizado_em":       m.atualizado_em.isoformat() if m.atualizado_em else None,
    }


# ── Rotas CRUD ─────────────────────────────────────────────
@router.get("/")
def listar_manutencoes(
    status:       Optional[str] = Query(None),
    ferramenta_id:Optional[int] = Query(None),
    empresa_id:   Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(get_usuario_atual),
):
    q = db.query(models.Manutencao)
    if status:        q = q.filter(models.Manutencao.status        == status)
    if ferramenta_id: q = q.filter(models.Manutencao.ferramenta_id == ferramenta_id)
    if empresa_id:    q = q.filter(models.Manutencao.empresa_id    == empresa_id)
    manutencoes = q.order_by(models.Manutencao.criado_em.desc()).offset(skip).limit(limit).all()
    return [_serializar(m) for m in manutencoes]


@router.get("/{id}")
def obter_manutencao(id: int, db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    m = db.query(models.Manutencao).filter(models.Manutencao.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada.")
    return _serializar(m)


@router.post("/", status_code=201)
def criar_manutencao(dados: ManutencaoCreate, db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    ferramenta = db.query(models.Ferramenta).filter(models.Ferramenta.id == dados.ferramenta_id).first()
    if not ferramenta:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada.")
    if ferramenta.estado == "emprestada":
        raise HTTPException(status_code=400, detail=f"Ferramenta '{ferramenta.nome}' está emprestada. Registre a devolução antes de enviar para manutenção.")

    m = models.Manutencao(**dados.model_dump())
    ferramenta.estado = "manutencao"
    db.add(m)
    db.commit()
    db.refresh(m)
    return _serializar(m)


@router.put("/{id}")
def atualizar_manutencao(id: int, dados: ManutencaoUpdate, db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    m = db.query(models.Manutencao).filter(models.Manutencao.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada.")
    if m.status in ("concluida", "cancelada"):
        raise HTTPException(status_code=400, detail="Manutenção finalizada não pode ser editada.")

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(m, campo, valor)
    db.commit()
    db.refresh(m)
    return _serializar(m)


@router.patch("/{id}/status")
def avancar_status(id: int, dados: AvancarStatusInput, db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    m = db.query(models.Manutencao).filter(models.Manutencao.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada.")

    proximos = ESTADOS.get(m.status, {}).get("proximos", [])
    if dados.novo_status not in proximos:
        raise HTTPException(
            status_code=400,
            detail=f"Transição inválida: '{m.status}' → '{dados.novo_status}'. Permitidos: {proximos}"
        )

    m.status = dados.novo_status

    if dados.descricao_servico: m.descricao_servico = dados.descricao_servico
    if dados.valor is not None: m.valor             = dados.valor
    if dados.observacoes:       m.observacoes       = dados.observacoes

    # Ao concluir: registra retorno real e libera ferramenta
    if dados.novo_status == "concluida":
        m.data_retorno_real     = dados.data_retorno_real or datetime.utcnow()
        m.ferramenta.estado     = "disponivel"

    # Ao cancelar: libera a ferramenta
    if dados.novo_status == "cancelada":
        m.ferramenta.estado = "disponivel"

    # Ao enviar para manutenção: registra data_envio se não tiver
    if dados.novo_status == "em_manutencao" and not m.data_envio:
        m.data_envio = datetime.utcnow()

    db.commit()
    db.refresh(m)
    return _serializar(m)


@router.delete("/{id}", status_code=204)
def deletar_manutencao(id: int, db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    m = db.query(models.Manutencao).filter(models.Manutencao.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Manutenção não encontrada.")
    if m.status in ("em_manutencao",):
        raise HTTPException(status_code=400, detail="Não é possível excluir uma manutenção em andamento. Cancele primeiro.")
    # Libera ferramenta se ainda marcada como manutencao
    if m.ferramenta and m.ferramenta.estado == "manutencao":
        m.ferramenta.estado = "disponivel"
    db.delete(m)
    db.commit()


# ── Resumo e histórico ─────────────────────────────────────
@router.get("/resumo/stats")
def resumo_manutencao(db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    por_status = (
        db.query(models.Manutencao.status, func.count(models.Manutencao.id))
        .group_by(models.Manutencao.status)
        .all()
    )
    custo_total = db.query(func.sum(models.Manutencao.valor)).scalar() or 0
    custo_concluidas = (
        db.query(func.sum(models.Manutencao.valor))
        .filter(models.Manutencao.status == "concluida")
        .scalar() or 0
    )

    # Ferramentas com mais manutenções (frequência de problemas)
    mais_problemas = (
        db.query(models.Ferramenta.nome, models.Ferramenta.codigo, func.count(models.Manutencao.id).label("total"))
        .join(models.Manutencao, models.Manutencao.ferramenta_id == models.Ferramenta.id)
        .group_by(models.Ferramenta.id)
        .order_by(func.count(models.Manutencao.id).desc())
        .limit(5)
        .all()
    )

    # Empresa com mais serviços
    por_empresa = (
        db.query(models.EmpresaManutencao.nome, func.count(models.Manutencao.id).label("total"))
        .join(models.Manutencao, models.Manutencao.empresa_id == models.EmpresaManutencao.id)
        .group_by(models.EmpresaManutencao.id)
        .order_by(func.count(models.Manutencao.id).desc())
        .limit(5)
        .all()
    )

    return {
        "por_status": {s: q for s, q in por_status},
        "custo_total":       round(custo_total, 2),
        "custo_concluidas":  round(custo_concluidas, 2),
        "mais_problemas":    [{"ferramenta": n, "codigo": c, "total": t} for n, c, t in mais_problemas],
        "por_empresa":       [{"empresa": n, "total": t}                 for n, t    in por_empresa],
    }


@router.get("/ferramenta/{ferramenta_id}/historico")
def historico_ferramenta(ferramenta_id: int, db: Session = Depends(get_db), _=Depends(get_usuario_atual)):
    f = db.query(models.Ferramenta).filter(models.Ferramenta.id == ferramenta_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada.")
    manutencoes = (
        db.query(models.Manutencao)
        .filter(models.Manutencao.ferramenta_id == ferramenta_id)
        .order_by(models.Manutencao.criado_em.desc())
        .all()
    )
    return {
        "ferramenta_id":   f.id,
        "ferramenta_nome": f.nome,
        "ferramenta_codigo": f.codigo,
        "total_manutencoes": len(manutencoes),
        "custo_total":     round(sum(m.valor or 0 for m in manutencoes), 2),
        "historico":       [_serializar(m) for m in manutencoes],
    }