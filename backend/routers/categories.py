from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

import models
import schemas
from database import get_db

router = APIRouter(prefix="/categorias", tags=["Categorias"])


@router.get("/", response_model=List[schemas.CategoriaOut])
def listar_categorias(
    busca: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Categoria)
    if busca:
        q = q.filter(models.Categoria.nome.ilike(f"%{busca}%"))
    return q.order_by(models.Categoria.nome).all()


@router.post("/", response_model=schemas.CategoriaOut, status_code=201)
def criar_categoria(dados: schemas.CategoriaCreate, db: Session = Depends(get_db)):
    # Validação de duplicidade case-insensitive
    existente = db.query(models.Categoria).filter(
        func.lower(models.Categoria.nome) == dados.nome.strip().lower()
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail=f"Categoria '{dados.nome}' já existe.")
    c = models.Categoria(**dados.model_dump())
    c.nome = dados.nome.strip()
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{id}", response_model=schemas.CategoriaOut)
def atualizar_categoria(id: int, dados: schemas.CategoriaCreate, db: Session = Depends(get_db)):
    c = db.query(models.Categoria).filter(models.Categoria.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    # Verifica duplicidade, ignora a própria
    conflito = db.query(models.Categoria).filter(
        func.lower(models.Categoria.nome) == dados.nome.strip().lower(),
        models.Categoria.id != id,
    ).first()
    if conflito:
        raise HTTPException(status_code=400, detail=f"Categoria '{dados.nome}' já existe.")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(c, campo, valor)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{id}", status_code=204)
def deletar_categoria(id: int, db: Session = Depends(get_db)):
    c = db.query(models.Categoria).filter(models.Categoria.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    # Impede exclusão se tiver ferramentas vinculadas
    total = db.query(func.count(models.Ferramenta.id)).filter(
        models.Ferramenta.categoria_id == id
    ).scalar()
    if total > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Categoria possui {total} ferramenta(s). Remova ou reatribua antes de excluir."
        )
    db.delete(c)
    db.commit()


# ── Detalhes completos ─────────────────────────────────────
@router.get("/{id}/detalhes")
def detalhes_categoria(id: int, db: Session = Depends(get_db)):
    c = db.query(models.Categoria).filter(models.Categoria.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    ferramentas = (
        db.query(models.Ferramenta)
        .filter(models.Ferramenta.categoria_id == id)
        .order_by(models.Ferramenta.codigo)
        .all()
    )

    por_estado = {}
    for f in ferramentas:
        por_estado[f.estado] = por_estado.get(f.estado, 0) + 1

    return {
        "id":        c.id,
        "nome":      c.nome,
        "cor":       c.cor,
        "icone":     c.icone,
        "descricao": c.descricao,
        "criado_em": c.criado_em.isoformat() if c.criado_em else None,

        # Resumo
        "total":       len(ferramentas),
        "disponiveis": por_estado.get("disponivel", 0),
        "emprestadas": por_estado.get("emprestada", 0),
        "manutencao":  por_estado.get("manutencao", 0),
        "reservadas":  por_estado.get("reservada",  0),

        # Lista completa
        "ferramentas": [
            {
                "id":        f.id,
                "codigo":    f.codigo,
                "nome":      f.nome,
                "estado":    f.estado,
                "localizacao": f.localizacao,
                "numero_serie": f.numero_serie,
                "foto":      f.foto,
            }
            for f in ferramentas
        ],
    }